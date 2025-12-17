# Shopee Crawler - Selectors và Pagination Implementation

## Tổng quan

Đã implement các CSS selectors và logic phân trang cho Shopee crawler để extract dữ liệu từ:
- **Listing pages** (trang tìm kiếm sản phẩm)
- **Detail pages** (trang chi tiết sản phẩm)

## 📋 Listing Page Selectors

### Cấu trúc HTML Shopee
```html
<ul class="shopee-search-item-result__items">
  <li class="shopee-search-item-result__item">
    <a class="contents" href="/product-url">
      <div class="line-clamp-2 break-words">Product Title</div>
      <span class="truncate text-base/5 font-medium">865.000₫</span>
      ...
    </a>
  </li>
</ul>
```

### Các trường dữ liệu được extract

| Trường | Selector | Mô tả |
|--------|----------|-------|
| **itemCard** | `li.shopee-search-item-result__item` | Container cho mỗi sản phẩm |
| **itemLink** | `a.contents` | Link đến trang chi tiết |
| **title** | `div.line-clamp-2.break-words` | Tên sản phẩm |
| **price** | `span.truncate.text-base\/5.font-medium` | Giá hiện tại |
| **discount** | `div.bg-shopee-pink span` | Phần trăm giảm giá (-12%, -20%...) |
| **rating** | `div.text-shopee-black87.text-xs\/sp14.flex-none` | Điểm đánh giá (5.0, 4.9...) |
| **soldCount** | `div.truncate.text-shopee-black87.text-xs` | Số lượng đã bán |
| **location** | `span.ml-\[3px\].align-middle` | Vị trí người bán |
| **thumbnail** | `img.inset-y-0.w-full.h-full` | Ảnh thu nhỏ sản phẩm |

### Ví dụ dữ liệu extracted

```json
{
  "itemUrl": "https://shopee.vn/product-name-i.12345.67890",
  "itemId": "67890",
  "title": "Nồi chiên không dầu 15L cao cấp",
  "price": 865000,
  "thumbnail": "https://down-vn.img.susercontent.com/...",
  "discount": "-12%",
  "rating": 5.0,
  "soldCount": "1k+",
  "location": "Hà Nội"
}
```

## 🔍 Detail Page Selectors

### Các trường dữ liệu được extract

| Trường | Selector | Fallback |
|--------|----------|----------|
| **title** | `span.zmdJz8` | `meta[property="og:title"]` |
| **images** | `img.uXN1L5`, `img[elementtiming="shopee:heroComponentPaint"]` | Srcset parsing |
| **price** | `div.rMge0Y` | - |
| **originalPrice** | `div.DhxY1u` | - |
| **discount** | `div.yiMptB` | - |
| **description** | `div.Ugqa7M` | `meta[name="description"]` |
| **categories** | `div.EzdN1k a` | Breadcrumbs |

### Image extraction strategy

1. Thử các selectors: `img.uXN1L5`, hero images, gallery images
2. Nếu không tìm thấy, parse từ `srcset` attribute để lấy ảnh resolution cao nhất
3. Normalize URLs và loại bỏ duplicates

### Ví dụ product data

```json
{
  "sourceId": "67890",
  "title": "Nồi chiên không dầu Rapido RAF 7.0M2",
  "sourceUrl": "https://shopee.vn/...",
  "sourceName": "Shopee",
  "domain": "ecommerce",
  "imageUrls": [
    "https://down-vn.img.susercontent.com/file/...",
    "https://down-vn.img.susercontent.com/file/..."
  ],
  "price": 865000,
  "originalPrice": 980000,
  "discount": "-12%",
  "description": "Nồi chiên không dầu...",
  "categories": ["Thiết Bị Điện Tử", "Đồ Gia Dụng"],
  "crawledAt": "2025-12-17T22:30:00Z"
}
```

## 🔄 Pagination Logic

### URL-based Pagination

Shopee sử dụng URL parameter `page` để phân trang:

```
https://shopee.vn/search?keyword=...&page=0
https://shopee.vn/search?keyword=...&page=1
https://shopee.vn/search?keyword=...&page=2
```

### Configuration

```typescript
urlPaginationConfig: {
    paramName: 'page',      // Parameter name trong URL
    startValue: 0,          // Shopee bắt đầu từ page 0
    increment: 1,           // Tăng 1 cho mỗi trang
    maxValue: 100,          // Giới hạn 100 trang
}
```

### Method `getNextPageUrl()`

Tự động generate URL trang tiếp theo:

1. Parse current URL
2. Lấy giá trị `page` hiện tại (hoặc `startValue` nếu chưa có)
3. Tăng giá trị lên `increment`
4. Kiểm tra `maxValue`
5. Trả về URL mới

### Method `getPaginationInfo()`

Kiểm tra có còn trang tiếp theo không:

1. Đếm số items trên trang hiện tại
2. Nếu không có items → hết trang
3. Generate next page URL
4. Trả về `{ hasNextPage: true/false, nextPageUrl: string }`

## 🧪 Test Script

File: `scripts/test-shopee.ts`

### Features

- ✅ Test extraction từ listing page
- ✅ Test pagination (crawl nhiều trang)
- ✅ Hiển thị preview 3 items đầu tiên mỗi trang
- ✅ Support manual login nếu cần
- ✅ Stealth mode để tránh detection

### Usage

```bash
npm run test:shopee
```

### Test flow

1. Navigate đến search page (page 0)
2. Đợi user login nếu cần (press ENTER để continue)
3. Extract items từ page hiện tại
4. Hiển thị preview 3 items
5. Check pagination
6. Navigate đến page tiếp theo
7. Lặp lại cho đến khi:
   - Hết trang
   - Đạt maxPages (default: 3)
   - Gặp lỗi

### Output example

```
============================================================
📄 Testing Page 0:
🔗 URL: https://shopee.vn/search?...&page=0
============================================================

🔍 Extracting items (this includes scrolling for lazy load)...
--------------------------------------------------
✅ SUCCESS: Found 60 items on page 0
--------------------------------------------------

📦 First 3 Items Preview:

--- Item 1 ---
{
  "itemUrl": "https://shopee.vn/...",
  "itemId": "51751644874",
  "title": "NỒI CHIÊN KHÔNG DẦU 15 LÍT CAO CẤP",
  "price": 865000,
  "discount": "-12%",
  "rating": 5.0,
  "soldCount": "5",
  "location": "Hà Nội"
}

🔄 Checking pagination...
✅ Next page available: https://shopee.vn/search?...&page=1
```

## 📁 Files Modified

1. **shopee.selector.ts** - CSS selectors và pagination config
2. **shopee.strategy.ts** - Extraction logic và pagination methods
3. **test-shopee.ts** - Test script

## 🎯 Key Features

✅ **Robust extraction** - Multiple fallback selectors  
✅ **URL pagination** - Automatic page navigation  
✅ **Rich data** - Extract nhiều fields (price, rating, sold count...)  
✅ **Image handling** - Parse srcset cho high-res images  
✅ **Error handling** - Graceful degradation  
✅ **Type safe** - Full TypeScript support  

## 🚀 Next Steps

1. Test với nhiều search queries khác nhau
2. Implement rate limiting để tránh bị block
3. Add proxy rotation nếu cần
4. Store extracted data vào database
5. Implement incremental crawling (chỉ crawl items mới)
