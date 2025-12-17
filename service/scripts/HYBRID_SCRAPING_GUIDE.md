# 🎯 Shopee Hybrid Scraper - Solution cho lỗi 403

## ⚡ Giải pháp

### Vấn đề với API Direct Call
```
❌ test-shopee-api.ts → 403 Forbidden
- Shopee chặn requests không có browser session
- Cần cookies + CSRF tokens + fingerprint
```

### ✅ Hybrid Approach = Best Solution

**Cách hoạt động:**
1. **Dùng browser** để bypass anti-bot (như test-shopee.ts)
2. **Intercept API responses** thay vì parse HTML
3. **Extract JSON data** trực tiếp từ network traffic

```typescript
// Listen to all API responses
page.on('response', async (response) => {
    const url = response.url();
    
    if (url.includes('/api/v4/search/search_items')) {
        const data = await response.json();
        // Got API data! No HTML parsing needed!
    }
});
```

---

## 📊 So sánh 3 Methods

| Method | Speed | Resource | Anti-bot | Maintenance | Server-friendly |
|--------|-------|----------|----------|-------------|-----------------|
| **Browser HTML** | ⭐⭐ (5-10s) | ⭐⭐ (High) | ✅ Yes | ⭐⭐ (Selectors change) | ❌ Needs GUI |
| **API Direct** | ⭐⭐⭐⭐⭐ (0.5s) | ⭐⭐⭐⭐⭐ (Low) | ❌ 403 Error | ⭐⭐⭐⭐⭐ (Stable) | ✅ Yes |
| **🏆 Hybrid** | ⭐⭐⭐⭐ (2-3s) | ⭐⭐⭐ (Medium) | ✅ Yes | ⭐⭐⭐⭐⭐ (Stable) | ✅ Headless OK |

---

## 🚀 Usage

### Local Development (with GUI)
```bash
npx tsx service/scripts/test-shopee-hybrid.ts
```

### Production Server (headless)
```typescript
const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,  // ← Chạy được trên server!
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

---

## 📦 Output Files

Trong `.temp/shopee-hybrid-output/`:

### 1. `items-{timestamp}.json`
Processed search results:
```json
{
  "itemId": 29008652848,
  "title": "Nồi chiên không dầu...",
  "price": 1589,
  "sold": 26,
  "rating": 5.0,
  "images": ["https://..."],
  "url": "https://shopee.vn/..."
}
```

### 2. `details-{timestamp}.json`
Product details:
```json
{
  "itemId": 29008652848,
  "description": "Full product description...",
  "brand": "Magic Eco",
  "stock": 100,
  "images": ["url1", "url2", "url3"]
}
```

### 3. `raw-api-{timestamp}.json`
Raw API responses for debugging:
```json
{
  "searchResponses": [...],
  "productDetails": [...]
}
```

---

## 🎯 Advantages

### vs Browser HTML Scraping
✅ **Không cần parse HTML** → Ít break khi UI thay đổi  
✅ **Nhanh hơn** → Không cần wait for elements  
✅ **Data đầy đủ hơn** → API trả về nhiều fields hơn HTML  

### vs API Direct Call
✅ **Không bị 403** → Browser authentication tự động  
✅ **Không cần cookies manual** → Session tự động  
✅ **Bypass anti-bot** → Giống người dùng thật  

---

## 🔧 Advanced Features

### 1. Intercept Multiple Pages
```typescript
// Automatically capture all search pages
for (let page = 0; page < 5; page++) {
    await page.goto(`https://shopee.vn/search?keyword=...&page=${page}`);
    await page.waitForTimeout(2000); // API responses auto-captured!
}
```

### 2. Batch Product Details
```typescript
// Click multiple products, intercept all details
const products = await page.locator('li.shopee-search-item-result__item').all();

for (const product of products.slice(0, 10)) {
    await product.click();
    await page.waitForTimeout(1000);
    await page.goBack();
    // All API responses captured!
}
```

### 3. Filter Specific APIs
```typescript
page.on('response', async (response) => {
    const url = response.url();
    
    // Search API
    if (url.includes('/search/search_items')) { /* ... */ }
    
    // Product API
    if (url.includes('/item/get')) { /* ... */ }
    
    // Reviews API
    if (url.includes('/item/get_ratings')) { /* ... */ }
    
    // Shop API
    if (url.includes('/shop/get_shop_detail')) { /* ... */ }
});
```

### 4. Save to Database
```typescript
import { MongoClient } from 'mongodb';

page.on('response', async (response) => {
    if (response.url().includes('/search/search_items')) {
        const data = await response.json();
        
        // Save directly to MongoDB
        await db.collection('products').insertMany(
            data.items.map(item => processItem(item.item_basic))
        );
    }
});
```

---

## 🖥️ Server Deployment

### Docker Setup
```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

# Run hybrid scraper in headless mode
CMD ["npx", "tsx", "scripts/test-shopee-hybrid.ts"]
```

### Environment Variables
```bash
# .env
HEADLESS=true
SHOPEE_KEYWORD="nồi chiên không dầu"
MAX_PAGES=10
OUTPUT_DIR=/app/data
```

### Cron Schedule
```bash
# Run every hour
0 * * * * cd /app && npx tsx scripts/test-shopee-hybrid.ts >> /var/log/scraper.log 2>&1
```

---

## 🐛 Troubleshooting

### No API responses captured

**Issue:** `searchResponses.length === 0`

**Solutions:**
1. Increase wait time: `await page.waitForTimeout(5000)`
2. Check network tab in DevTools to verify API calls
3. Page might have captcha → solve manually first

### Browser crashes on server

**Issue:** Headless mode fails

**Solutions:**
```bash
# Install dependencies
sudo apt-get install -y \
    libgbm1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0

# Use smaller viewport
viewport: { width: 800, height: 600 }

# Disable GPU
args: ['--disable-gpu', '--disable-dev-shm-usage']
```

### Rate limiting

**Issue:** Too many requests

**Solutions:**
```typescript
// Add delays
await page.waitForTimeout(Math.random() * 2000 + 1000);

// Rotate user agents
const userAgents = [...];
const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

// Use proxy rotation
proxy: { server: 'http://...' }
```

---

## 📚 API Endpoints Discovered

### Search
```
GET /api/v4/search/search_items
?keyword=...&limit=60&newest=0&by=relevancy
```

### Product Detail
```
GET /api/v4/item/get
?itemid=...&shopid=...
```

### Reviews
```
GET /api/v4/item/get_ratings
?itemid=...&shopid=...&limit=20&offset=0
```

### Shop Info
```
GET /api/v4/shop/get_shop_detail
?shopid=...
```

### Categories
```
GET /api/v4/category_list/get
```

---

## 🎓 Learning Points

1. **Network interception** là powerful tool
2. **Hybrid approach** balance giữa speed và anti-bot
3. **Headless browser** chạy được trên server
4. **API responses** stable hơn HTML structure
5. **One codebase** cho local + production

---

## 🚀 Next Steps

1. ✅ **Working solution** - Hybrid scraper
2. 🔄 **Pagination** - Auto scroll/navigate pages
3. 📊 **Database integration** - Save to MongoDB/PostgreSQL
4. ⚡ **Queue system** - Bull/Redis for job processing
5. 🔄 **Scheduler** - Cron/node-cron for automation
6. 📈 **Monitoring** - Sentry/Prometheus
7. 🐳 **Containerization** - Docker deployment

---

## 💡 Pro Tips

**Tip 1:** Combine với session persistence
```typescript
// Export cookies after first run
await context.storageState({ path: 'shopee-session.json' });

// Reuse in subsequent runs
await chromium.launchPersistentContext(dir, {
    storageState: 'shopee-session.json'
});
```

**Tip 2:** Parallel scraping với multiple contexts
```typescript
const contexts = await Promise.all([
    chromium.launchPersistentContext('profile1'),
    chromium.launchPersistentContext('profile2'),
    chromium.launchPersistentContext('profile3'),
]);
```

**Tip 3:** Retry failed API calls
```typescript
const capturedData = new Map();

page.on('response', async (response) => {
    try {
        const data = await response.json();
        capturedData.set(response.url(), data);
    } catch (error) {
        // Retry or log
    }
});
```

---

## 📖 Resources

- [Playwright Network Events](https://playwright.dev/docs/network)
- [Response Interception](https://playwright.dev/docs/api/class-response)
- [Headless Mode Guide](https://playwright.dev/docs/ci)
- [Docker Playwright](https://playwright.dev/docs/docker)

---

**🎉 Kết luận:** Hybrid approach là best solution cho Shopee scraping - fast, stable, và server-friendly!
