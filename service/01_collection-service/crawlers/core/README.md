# 🏗️ Crawler Core

Core module chứa các base classes và interfaces cho hệ thống crawler đa miền (multi-domain).

## 📁 Cấu trúc

```
core/
├── README.md                 # Documentation (file này)
├── extraction-strategy.ts    # Strategy pattern interface + base class
├── base-selector.ts          # Site selector configuration types
├── base-scraper.ts           # Base scraper với common utilities
└── base-collector.ts         # Main Crawlee PlaywrightCrawler wrapper
```

---

## 🎯 Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GenericCollector                             │
│                   (Điều phối Crawlee crawler)                       │
│                              │                                      │
│                              │ uses                                 │
│                              ▼                                      │
│              ┌───────────────────────────────┐                     │
│              │    ExtractionStrategy         │◄── INTERFACE        │
│              │        (abstract)             │                     │
│              └───────────────┬───────────────┘                     │
│                              │                                      │
│           ┌──────────────────┼──────────────────┐                  │
│           │                  │                  │                  │
│           ▼                  ▼                  ▼                  │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │
│   │  Ecommerce  │    │    News     │    │    Jobs     │           │
│   │  Strategy   │    │  Strategy   │    │  Strategy   │           │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘           │
│          │                  │                  │                   │
│          ▼                  ▼                  ▼                   │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │
│   │ BigW, Amazon│    │  BBC, CNN   │    │LinkedIn,etc │           │
│   │  Scrapers   │    │  Scrapers   │    │  Scrapers   │           │
│   └─────────────┘    └─────────────┘    └─────────────┘           │
│                                                                    │
│   OUTPUT:              OUTPUT:             OUTPUT:                 │
│   Product[]            Article[]           JobListing[]            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Các thành phần

### 1. `extraction-strategy.ts` - ⭐ Core Interface

**Mục đích:** Định nghĩa "hợp đồng" (contract) cho việc trích xuất dữ liệu từ các domain khác nhau.

**Design Pattern:** Strategy Pattern

#### Interface `ExtractionStrategy<TData, TListingItem>`

```typescript
interface ExtractionStrategy<TData, TListingItem> {
    // Properties
    readonly domain: string;              // 'ecommerce', 'news', 'jobs'
    readonly supportedPageTypes: PageType[];
    readonly detectionRules: PageDetectionRule[];
    
    // Core Methods
    detectPageType(url, page?): Promise<PageContext>;
    extractListingItems(page, context): Promise<ExtractionResult & { listingItems }>;
    extractDetailData($, url, context): Promise<ExtractionResult<TData>>;
    getPaginationInfo(page, context): Promise<PaginationInfo>;
    validateData(data): ValidationResult;
    transformData(data): TData;
}
```

#### Trách nhiệm của mỗi method

| Method | Input | Output | Trách nhiệm |
|--------|-------|--------|-------------|
| `detectPageType` | URL, Page? | PageContext | Xác định loại trang (listing/detail) từ URL patterns hoặc selectors |
| `extractListingItems` | Page, Context | ListingItem[] | Extract URLs và preview info từ trang listing/search |
| `extractDetailData` | Cheerio, URL, Context | TData | Extract đầy đủ data từ trang chi tiết |
| `getPaginationInfo` | Page, Context | PaginationInfo | Xác định có trang tiếp theo không, URL next page |
| `validateData` | TData | ValidationResult | Kiểm tra data có hợp lệ không (required fields, formats) |
| `transformData` | TData | TData | Clean/normalize data trước khi lưu |

#### Abstract Class `BaseExtractionStrategy`

Cung cấp default implementations cho các operations phổ biến:

```typescript
abstract class BaseExtractionStrategy<TData, TListingItem> 
    implements ExtractionStrategy<TData, TListingItem> 
{
    // ✅ Default implementations
    async detectPageType(url, page?): Promise<PageContext> { ... }
    validateData(data): ValidationResult { ... }
    transformData(data): TData { ... }
    async getPaginationInfo(page, context): Promise<PaginationInfo> { ... }
    
    // ❌ MUST implement in subclass
    abstract extractListingItems(page, context): Promise<...>;
    abstract extractDetailData($, url, context): Promise<...>;
    
    // 🔧 Utility methods
    protected parsePrice(priceString): number | null;
    protected normalizeUrl(url, baseUrl): string;
    protected extractText($, selector): string | undefined;
    protected extractAttr($, selector, attr): string | undefined;
    protected extractImageUrls($, selector, baseUrl): string[];
    protected extractBreadcrumbs($, selector): string[];
    protected getCheerio(page): Promise<CheerioAPI>;
    protected extractIdFromUrl(url, pattern): string | null;
}
```

#### Flow khi xử lý một trang

```
                           URL Request
                               │
                               ▼
                    ┌─────────────────────┐
                    │   detectPageType()  │
                    │   → LISTING/DETAIL  │
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
    ┌─────────────────┐               ┌─────────────────┐
    │  LISTING PAGE   │               │   DETAIL PAGE   │
    └────────┬────────┘               └────────┬────────┘
             │                                 │
             ▼                                 ▼
┌────────────────────────┐         ┌────────────────────────┐
│  extractListingItems() │         │   extractDetailData()  │
│  → URLs, previews      │         │   → Full data object   │
└────────────┬───────────┘         └────────────┬───────────┘
             │                                 │
             ▼                                 ▼
┌────────────────────────┐         ┌────────────────────────┐
│  getPaginationInfo()   │         │     validateData()     │
│  → Next page URL?      │         │     → Valid?           │
└────────────┬───────────┘         └────────────┬───────────┘
             │                                 │
             ▼                                 ▼
       Enqueue URLs                ┌────────────────────────┐
       (products + next page)      │    transformData()     │
                                   │    → Clean/normalize   │
                                   └────────────┬───────────┘
                                               │
                                               ▼
                                         Save to Dataset
```

---

### 2. `base-selector.ts` - Site Configuration

**Mục đích:** Định nghĩa cấu trúc selectors và config cho mỗi website.

```typescript
interface SiteSelectors {
    // Listing page
    productCard: string;           // '.product-tile'
    productLink: string;           // '.product-tile a'
    productUrlGlobs?: string[];    // ['**/product/**']
    
    // Pagination
    nextPageSelector?: string;
    loadMoreButton?: string;
    noMoreResultsIndicator?: string;
    
    // Detail page
    detailTitle: string;
    detailPrice: string;
    detailImages: string | string[];
    // ... more selectors
    
    // Block detection
    captchaSelector?: string;
    blockedSelector?: string;
}

interface SiteConfig {
    siteName: string;              // 'bigw'
    baseUrl: string;               // 'https://bigw.com.au'
    selectors: SiteSelectors;
    paginationType: 'infinite_scroll' | 'next_page_link' | 'load_more_button' | 'url_pagination';
    infiniteScrollConfig?: { ... };
    customHeaders?: Record<string, string>;
}
```

---

### 3. `base-scraper.ts` - Site-specific Scraper Base

**Mục đích:** Base class cho site-specific scrapers, kế thừa từ domain strategy.

```typescript
abstract class BaseScraper<TData, TListingItem> {
    protected config: SiteConfig;
    protected selectors: SiteSelectors;
    
    // Pagination handling
    async handleInfiniteScroll(page): Promise<number>;
    async handleLoadMoreButton(page): Promise<number>;
    getNextPageUrl(currentUrl, pageNumber): string | null;
    
    // Block detection
    async checkBlockedOrCaptcha(page): Promise<void>;
    
    // Utilities
    async getCheerio(page): Promise<CheerioAPI>;
    normalizeUrl(url): string;
    parsePrice(priceString): number | null;
    isValidProductUrl(url): boolean;
}
```

---

### 4. `base-collector.ts` - Main Crawler

**Mục đích:** Wrapper cho Crawlee PlaywrightCrawler, điều phối toàn bộ quá trình crawl.

```typescript
class GenericCollector<TData, TListingItem> {
    constructor(
        strategy: ExtractionStrategy<TData, TListingItem>,
        siteConfig: SiteConfig,
        crawlerConfig: CrawlerConfig
    );
    
    async run(): Promise<TData[]>;
    getStats(): CrawlStats;
    async exportResults(format: 'json' | 'csv'): Promise<void>;
}
```

**Crawlee Features được sử dụng:**

| Feature | Mục đích |
|---------|----------|
| `PlaywrightCrawler` | Browser automation |
| `createPlaywrightRouter` | Route requests theo page type |
| `RequestQueue` | Quản lý URL queue (auto dedup) |
| `Dataset` | Lưu extracted data |
| `enqueueLinks` | Tự động enqueue URLs |
| `infiniteScroll` | Handle infinite scroll pages |
| `ProxyConfiguration` | Proxy rotation |
| `SessionPool` | Session management |

---

## 🔄 Luồng dữ liệu

```
┌──────────────┐
│  Start URLs  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│                     GenericCollector                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   PlaywrightCrawler                     │ │
│  │                                                         │ │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐│ │
│  │  │   Router    │───▶│   Handler   │───▶│  Strategy   ││ │
│  │  │ (by label)  │    │ (per type)  │    │ (extract)   ││ │
│  │  └─────────────┘    └─────────────┘    └─────────────┘│ │
│  │         │                  │                  │        │ │
│  │         │                  │                  │        │ │
│  │         ▼                  ▼                  ▼        │ │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐│ │
│  │  │RequestQueue │    │   Session   │    │   Dataset   ││ │
│  │  │ (URLs)      │    │   Pool      │    │ (results)   ││ │
│  │  └─────────────┘    └─────────────┘    └─────────────┘│ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│   TData[]    │ (Product[], Article[], JobListing[], etc.)
└──────────────┘
```

---

## 🧩 Cách mở rộng

### Thêm domain mới (ví dụ: Real Estate)

1. **Tạo type** trong `shared/types/domains/real-estate/`:
```typescript
interface Property extends BaseCrawlData {
    domain: 'real-estate';
    price: number;
    bedrooms: number;
    bathrooms: number;
    squareMeters: number;
    // ...
}
```

2. **Tạo strategy** trong `crawlers/domains/real-estate/`:
```typescript
class RealEstateStrategy extends BaseExtractionStrategy<Property, PropertyListingItem> {
    readonly domain = 'real-estate';
    // implement abstract methods
}
```

3. **Tạo site scraper** trong `crawlers/domains/real-estate/sites/`:
```typescript
class DomainComAuScraper extends RealEstateStrategy {
    readonly detectionRules = [...];
    // implement extractListingItems, extractDetailData
}
```

### Thêm site mới cho domain có sẵn

1. **Tạo selector config** (`sites/newsite/newsite.selector.ts`)
2. **Tạo scraper** (`sites/newsite/newsite.scraper.ts`) extend domain strategy
3. **Register** trong domain index

---

## 📐 Design Principles

| Principle | Áp dụng |
|-----------|---------|
| **Single Responsibility** | Mỗi class có 1 nhiệm vụ rõ ràng |
| **Open/Closed** | Mở rộng domain/site mới mà không sửa core |
| **Liskov Substitution** | Mọi strategy đều có thể thay thế nhau |
| **Interface Segregation** | Interface nhỏ, focused |
| **Dependency Inversion** | Collector phụ thuộc vào abstraction (Strategy), không phụ thuộc vào concrete class |

---

## 🔗 Dependencies

```
extraction-strategy.ts
    └── imports from: shared/types/core/*

base-selector.ts
    └── imports from: shared/types/core/*

base-scraper.ts
    └── imports from: extraction-strategy.ts, base-selector.ts

base-collector.ts
    └── imports from: extraction-strategy.ts, base-selector.ts
    └── imports from: crawlee, playwright
```

---

## 📚 Xem thêm

- `../../shared/types/core/` - Core type definitions
- `../../shared/types/domains/` - Domain-specific types
- `../domains/` - Domain strategy implementations
- `../e-commerces/`, `../news/`, etc. - Site-specific scrapers

