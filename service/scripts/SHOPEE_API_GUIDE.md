# Shopee API Scraper

## 🚀 Sử dụng

### Method 1: Không cần cookies (có thể bị 403)

```bash
npx tsx service/scripts/test-shopee-api.ts
```

### Method 2: Với cookies từ browser (recommended)

**Bước 1:** Lấy cookies từ browser

1. Mở https://shopee.vn trong Chrome/Firefox
2. Login vào tài khoản (nếu cần)
3. Mở DevTools (F12)
4. Vào tab **Application** → **Cookies** → `https://shopee.vn`
5. Copy tất cả cookies thành string format:

```
SPC_F=...; SPC_R_T_ID=...; SPC_T_ID=...; ...
```

**Tools để export cookies:**
- **Chrome Extension:** "Get cookies.txt LOCALLY"
- **Manual:** Click từng cookie và copy value

**Bước 2:** Set cookies vào code

```typescript
const client = new ShopeeAPIClient();

// Paste cookies từ browser
const cookies = 'SPC_F=xyz123; SPC_R_T_ID=abc456; SPC_T_ID=def789; ...';
client.setCookies(cookies);

// Scrape as usual
const result = await client.search('nồi chiên không dầu');
```

**Bước 3:** Hoặc dùng environment variable

```bash
export SHOPEE_COOKIES="SPC_F=xyz; SPC_R_T_ID=abc; ..."
npx tsx service/scripts/test-shopee-api.ts
```

```typescript
// Trong code
const cookies = process.env.SHOPEE_COOKIES || '';
if (cookies) {
    client.setCookies(cookies);
}
```

---

## 📋 API Endpoints

### 1. Search Products

```typescript
GET /api/v4/search/search_items
```

**Parameters:**
- `keyword`: Search keyword
- `limit`: Items per page (max 60)
- `newest`: Offset for pagination (page * limit)
- `by`: Sort by (relevancy, sales, price)
- `order`: asc/desc

### 2. Get Product Detail

```typescript
GET /api/v4/item/get
```

**Parameters:**
- `itemid`: Product ID
- `shopid`: Shop ID

---

## ⚙️ Configuration

### Rate Limiting

```typescript
// Delay between requests
await new Promise(resolve => setTimeout(resolve, 500)); // 500ms

// Delay between pages
await new Promise(resolve => setTimeout(resolve, 1000)); // 1s
```

### Retry Logic

```typescript
async function searchWithRetry(keyword: string, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await client.search(keyword);
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        }
    }
}
```

---

## 🐛 Troubleshooting

### Error: 403 Forbidden

**Nguyên nhân:** Shopee block request vì thiếu cookies/session

**Giải pháp:**
1. ✅ Thêm cookies từ browser session
2. ✅ Thêm đầy đủ headers (Sec-Ch-Ua, Sec-Fetch-*)
3. ✅ Use residential proxy
4. ✅ Rotate User-Agent

### Error: 90309999

**Nguyên nhân:** Anti-bot detection

**Giải pháp:**
1. Login vào Shopee trước
2. Lấy cookies fresh (< 1 giờ)
3. Thêm delay giữa requests
4. Use proxy rotation

---

## 🔥 So sánh Browser vs API

| Feature | Browser Scraping | API Scraping |
|---------|------------------|--------------|
| **Speed** | Slow (~5-10s/page) | Fast (~0.5-1s/page) |
| **Resources** | High (RAM, CPU) | Low |
| **Detection** | Medium | Low (nếu có cookies) |
| **Setup** | Complex | Simple |
| **Maintenance** | Hard (selectors change) | Easy (API stable) |
| **CAPTCHA** | Must solve | Rare |

**Recommendation:** Dùng API scraping khi có thể!

---

## 💡 Advanced Tips

### 1. Cookie Rotation

```typescript
const cookiePool = [
    'cookies_account_1',
    'cookies_account_2',
    'cookies_account_3',
];

function rotateCookies() {
    const cookies = cookiePool[Math.floor(Math.random() * cookiePool.length)];
    client.setCookies(cookies);
}
```

### 2. Proxy Support

```typescript
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

const proxyAgent = new HttpsProxyAgent('http://proxy:port');

axios.get(url, {
    httpsAgent: proxyAgent,
    headers: {...}
});
```

### 3. Session Management

```typescript
// Save session to file
import { writeFileSync, readFileSync } from 'fs';

// Export cookies after login
const cookies = getCookiesFromBrowser();
writeFileSync('.shopee-session.txt', cookies);

// Reuse later
const savedCookies = readFileSync('.shopee-session.txt', 'utf-8');
client.setCookies(savedCookies);
```

---

## 📊 Output Format

### Search Results

```json
{
  "itemId": 123456,
  "shopId": 789,
  "title": "Product Name",
  "price": 865000,
  "sold": 1000,
  "rating": 4.9,
  "images": ["url1", "url2"],
  "url": "https://shopee.vn/..."
}
```

### Product Details

```json
{
  "itemId": 123456,
  "title": "Full Product Name",
  "description": "Product description...",
  "price": 865000,
  "stock": 100,
  "sold": 1000,
  "rating": 4.9,
  "categories": ["Category 1", "Category 2"],
  "images": ["url1", "url2", "url3"],
  "brand": "Brand Name"
}
```

---

## 🎯 Use Cases

1. **Price Monitoring:** Track price changes over time
2. **Product Research:** Find trending products
3. **Competitor Analysis:** Monitor competitors' products
4. **Inventory Tracking:** Check stock levels
5. **Review Scraping:** Collect customer reviews (separate API)

---

## 🔐 Legal & Ethics

- ✅ Respect rate limits
- ✅ Don't overload servers
- ✅ Follow Shopee's Terms of Service
- ✅ Use for research/personal purposes only
- ❌ Don't resell scraped data
- ❌ Don't scrape personal information

---

## 📚 Resources

- [Shopee API Documentation](https://open.shopee.com/) (Official)
- [Browser DevTools Guide](https://developer.chrome.com/docs/devtools/)
- [Axios Documentation](https://axios-http.com/)
