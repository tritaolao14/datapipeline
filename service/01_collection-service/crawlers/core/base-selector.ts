// ============================================================
// BASE-SELECTOR.TS - Site selector configuration types
// Định nghĩa cấu trúc selectors và config cho mỗi website
// ============================================================

import { PageType } from '../../../shared/types/core/crawl-data.type';

// ═══════════════════════════════════════════════════════════════
// PAGINATION TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Các loại pagination mà site có thể sử dụng
 */
export type PaginationType =
    | 'infinite_scroll'     // Scroll xuống để load thêm - dùng Crawlee infiniteScroll()
    | 'load_more_button'    // Click nút "Load More" / "Xem thêm"
    | 'next_page_link'      // Click/follow link "Next" / "Trang sau"
    | 'url_pagination';     // Thay đổi URL params: ?page=2, ?offset=20

// ═══════════════════════════════════════════════════════════════
// SITE SELECTORS INTERFACE
// ═══════════════════════════════════════════════════════════════

/**
 * Selectors cho một website
 * 
 * Sử dụng với:
 * - Playwright: page.$(selector), page.$$(selector)
 * - Cheerio: $(selector)
 * - Crawlee: enqueueLinks({ selector })
 */
export interface SiteSelectors {
    // ─────────────────────────────────────────────────────────────
    // LISTING PAGE SELECTORS
    // Dùng để extract danh sách items từ trang listing/search/category
    // ─────────────────────────────────────────────────────────────

    /**
     * Selector cho mỗi item card/tile trên listing page
     * Ví dụ: '.product-tile', '[data-testid="product-card"]'
     */
    itemCard: string;

    /**
     * Selector cho link đến detail page (trong item card hoặc global)
     * Ví dụ: '.product-tile a', 'a[href*="/product/"]'
     */
    itemLink: string;

    /**
     * Glob patterns để filter URLs khi enqueue
     * Dùng với Crawlee enqueueLinks({ globs })
     * Ví dụ: ['product', '*p*']
     */
    itemUrlGlobs?: string[];

    /**
     * Regex pattern để validate item URLs
     * Dùng khi globs không đủ flexible
     */
    itemUrlRegex?: RegExp;

    // Optional: Preview info từ listing
    listingTitle?: string;
    listingSubtitle?: string;
    listingImage?: string;
    listingPrice?: string;
    listingMeta?: string;
    listingCategory?: string;

    listingUrlGlobs?: string[];
    // ─────────────────────────────────────────────────────────────
    // PAGINATION SELECTORS
    // ─────────────────────────────────────────────────────────────


    /** Nút/link "Next Page" hoặc "Trang sau" */
    nextPageSelector?: string;

    /** Nút "Load More" hoặc "Xem thêm" */
    loadMoreButton?: string;

    /** Indicator đã hết kết quả (ví dụ: "Không còn sản phẩm") */
    noMoreResultsIndicator?: string;

    /** Loading spinner/skeleton khi đang load */
    loadingIndicator?: string;

    /** Container chứa pagination (để check tồn tại) */
    paginationContainer?: string;

    // ─────────────────────────────────────────────────────────────
    // DETAIL PAGE SELECTORS
    // Dùng để extract thông tin chi tiết từ detail page
    // ─────────────────────────────────────────────────────────────

    /** Tiêu đề chính */
    detailTitle: string;

    /** Tiêu đề phụ / subtitle */
    detailSubtitle?: string;

    /** Mô tả / description */
    detailDescription?: string;

    /** Nội dung chính / body content */
    detailContent?: string;

    /**
     * Hình ảnh - có thể là string hoặc array để try multiple selectors
     * Ví dụ: '.product-gallery img' hoặc ['.main-image img', '.carousel img']
     */
    detailImages: string | string[];

    /** Thumbnails trong gallery (để convert sang full size) */
    detailGalleryThumbnails?: string;

    /** Videos */
    detailVideos?: string;

    /** Breadcrumbs navigation */
    breadcrumbs?: string;

    /** Tác giả / author */
    detailAuthor?: string;

    /** Ngày publish */
    detailPublishDate?: string;

    /** Ngày update */
    detailUpdateDate?: string;

    /** Tags / keywords */
    detailTags?: string;

    /** Categories */
    detailCategories?: string;

    // ─────────────────────────────────────────────────────────────
    // ECOMMERCE-SPECIFIC SELECTORS (Optional)
    // ─────────────────────────────────────────────────────────────

    /** Current price */
    detailPrice?: string;

    /** Original/compare at price */
    detailOriginalPrice?: string;

    /** Discount percentage/amount */
    detailDiscount?: string;

    /** SKU / Product code */
    detailSku?: string;

    /** Stock status */
    detailStock?: string;

    /** Breadcrumbs navigation */
    detailBreadcrumbs?: string;

    /** Specifications table */
    detailSpecifications?: string;

    /** Reviews section */
    detailReviews?: string;

    // ─────────────────────────────────────────────────────────────
    // DOMAIN-SPECIFIC SELECTORS (Optional - extend in domain)
    // ─────────────────────────────────────────────────────────────

    /**
     * Custom selectors cho domain-specific fields
     * Ví dụ ecommerce: { price: '.price', brand: '.brand-name' }
     * Ví dụ news: { headline: 'h1.headline', byline: '.byline' }
     */
    custom?: Record<string, string | string[]>;

    // ─────────────────────────────────────────────────────────────
    // BLOCK/CAPTCHA DETECTION SELECTORS
    // ─────────────────────────────────────────────────────────────

    /** Selector để detect CAPTCHA */
    captchaSelector?: string;

    /** Selector để detect bị block */
    blockedSelector?: string;

    /** Selector để detect access denied */
    accessDeniedSelector?: string;

    /** Selector để detect error page */
    errorPageSelector?: string;
}

// ═══════════════════════════════════════════════════════════════
// INFINITE SCROLL CONFIG
// ═══════════════════════════════════════════════════════════════

/**
 * Config cho infinite scroll
 * Dùng với Crawlee infiniteScroll() utility
 */
export interface InfiniteScrollConfig {
    /** Số lần scroll tối đa (tránh infinite loop) */
    maxScrolls?: number;

    /** Thời gian chờ giữa các scroll (ms) */
    scrollDelay?: number;

    /** Selector để đếm items (check có load thêm không) */
    itemSelector: string;

    /** Scroll đến element này thay vì cuối trang */
    scrollToSelector?: string;

    /** Timeout cho mỗi lần scroll (ms) */
    scrollTimeout?: number;

    /** Button để click trước khi scroll (nếu cần) */
    buttonToClick?: string;
}

// ═══════════════════════════════════════════════════════════════
// URL PAGINATION CONFIG
// ═══════════════════════════════════════════════════════════════

/**
 * Config cho URL-based pagination
 * Ví dụ: ?page=1, ?offset=0, ?p=1
 */
export interface UrlPaginationConfig {
    /** Tên parameter: 'page', 'p', 'offset', 'start', etc. */
    paramName: string;

    /** Giá trị bắt đầu: 1 hoặc 0 */
    startValue: number;

    /** Mỗi lần tăng bao nhiêu: 1 cho page, 20/50 cho offset */
    increment: number;

    /** Giá trị tối đa (optional) */
    maxValue?: number;
}

// ═══════════════════════════════════════════════════════════════
// LOAD MORE BUTTON CONFIG
// ═══════════════════════════════════════════════════════════════

/**
 * Config cho load more button
 * Ví dụ: button:has-text("Load More")
 */
export interface LoadMoreButtonConfig {
    /** Selector cho nút "Load More" */
    selector: string | string[];

    /** Text cho nút "Load More" */
    text?: string;
}

// ═══════════════════════════════════════════════════════════════
// SITE CONFIG INTERFACE
// ═══════════════════════════════════════════════════════════════

/**
 * Full configuration cho một website
 */
export interface SiteConfig {
    // ─────────────────────────────────────────────────────────────
    // IDENTIFIERS
    // ─────────────────────────────────────────────────────────────

    /** Site identifier (lowercase, no spaces): 'bigw', 'amazon-au', 'bbc' */
    siteName: string;

    /** Display name: 'BigW Australia', 'Amazon AU', 'BBC News' */
    displayName?: string;

    /** Base URL của site: 'https://www.bigw.com.au' */
    baseUrl: string;

    /** Domain của site (không có protocol): 'bigw.com.au' */
    domain?: string;

    // ─────────────────────────────────────────────────────────────
    // SELECTORS
    // ─────────────────────────────────────────────────────────────

    /** All selectors cho site này */
    selectors: SiteSelectors;

    // ─────────────────────────────────────────────────────────────
    // PAGINATION CONFIG
    // ─────────────────────────────────────────────────────────────

    /** Loại pagination site sử dụng */
    paginationType: PaginationType;

    /** Config cho infinite scroll (nếu paginationType = 'infinite_scroll') */
    infiniteScrollConfig?: InfiniteScrollConfig;

    /** Config cho URL pagination (nếu paginationType = 'url_pagination') */
    urlPaginationConfig?: UrlPaginationConfig;

    /** Config cho load more button (nếu paginationType = 'load_more_button') */
    loadMoreButtonConfig?: LoadMoreButtonConfig;

    // ─────────────────────────────────────────────────────────────
    // TIMING & PERFORMANCE
    // ─────────────────────────────────────────────────────────────

    /** Default timeout cho navigation (ms) */
    defaultTimeout?: number;

    /** Delay giữa các requests (ms) - để tránh rate limiting */
    requestDelay?: number;

    /** Delay sau khi page load trước khi extract (ms) */
    postLoadDelay?: number;

    // ─────────────────────────────────────────────────────────────
    // HTTP CONFIG
    // ─────────────────────────────────────────────────────────────

    /** Custom HTTP headers */
    customHeaders?: Record<string, string>;

    /** Custom cookies */
    customCookies?: Array<{
        name: string;
        value: string;
        domain?: string;
        path?: string;
    }>;

    /** User agent cụ thể (hoặc để Crawlee random) */
    userAgent?: string;

    // ─────────────────────────────────────────────────────────────
    // BLOCK DETECTION
    // ─────────────────────────────────────────────────────────────

    /** HTTP status codes coi là bị block */
    blockedStatusCodes?: number[];

    /** Keywords trong response body coi là bị block */
    blockedBodyKeywords?: string[];

    // ─────────────────────────────────────────────────────────────
    // SITE-SPECIFIC OPTIONS
    // ─────────────────────────────────────────────────────────────

    /** Site có cần JavaScript để render không */
    requiresJavaScript?: boolean;

    /** Site có lazy-load images không */
    hasLazyLoadImages?: boolean;

    /** Locale/region của site */
    locale?: string;

    /** Currency code */
    currency?: string;

    /** Custom options */
    customOptions?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create SiteConfig với defaults
 */
export function createSiteConfig(config: Partial<SiteConfig> & Pick<SiteConfig, 'siteName' | 'baseUrl' | 'selectors' | 'paginationType'>): SiteConfig {
    return {
        defaultTimeout: 30000,
        requestDelay: 1000,
        postLoadDelay: 500,
        blockedStatusCodes: [403, 429, 503],
        requiresJavaScript: true,
        hasLazyLoadImages: true,
        ...config,
    };
}

/**
 * Merge selectors với defaults
 */
export function mergeSelectors(
    base: Partial<SiteSelectors>,
    override: Partial<SiteSelectors>
): SiteSelectors {
    return {
        ...base,
        ...override,
        custom: {
            ...base.custom,
            ...override.custom,
        },
    } as SiteSelectors;
}