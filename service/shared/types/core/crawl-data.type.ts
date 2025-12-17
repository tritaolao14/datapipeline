// ============================================================
// CRAWL-DATA.TYPE.TS - Generic data types cho MỌI loại crawl
// Domain-agnostic - có thể dùng cho products, articles, profiles, etc.
// ============================================================

/**
 * Base interface cho TẤT CẢ extracted data
 * Mọi domain-specific type sẽ extend từ đây
 */
export interface BaseCrawlData {
    // ─────────────────────────────────────────────────────────
    // Universal Identifiers
    // ─────────────────────────────────────────────────────────
    /** Unique ID từ source (product ID, article ID, etc.) */
    sourceId: string;

    /** URL gốc */
    sourceUrl: string;

    /** Site/source name */
    sourceName: string;

    /** Domain type: 'ecommerce', 'news', 'social', 'jobs', etc. */
    domain: string;

    // ─────────────────────────────────────────────────────────
    // Universal Content
    // ─────────────────────────────────────────────────────────
    /** Tiêu đề/title chính */
    title: string;

    /** Mô tả/content summary */
    description?: string;

    /** Full content/body (HTML hoặc text) */
    content?: string;

    // ─────────────────────────────────────────────────────────
    // Universal Media
    // ─────────────────────────────────────────────────────────
    /** Image URLs */
    imageUrls?: string[];

    /** Video URLs */
    videoUrls?: string[];

    /** Document/file URLs */
    documentUrls?: string[];

    // ─────────────────────────────────────────────────────────
    // Universal Categorization
    // ─────────────────────────────────────────────────────────
    /** Categories/tags */
    categories?: string[];

    /** Tags/keywords */
    tags?: string[];

    // ─────────────────────────────────────────────────────────
    // Universal Metadata
    // ─────────────────────────────────────────────────────────
    /** Crawl timestamp */
    crawledAt: string;

    /** Content publish/update date (nếu có) */
    publishedAt?: string;
    updatedAt?: string;

    /** Author/creator info */
    author?: string;

    /** Raw HTML snapshot */
    htmlSnapshot?: string;

    /** Domain-specific data - flexible key-value */
    metadata?: Record<string, unknown>;
}

/**
 * Listing item - minimal info từ list/search pages
 * Generic cho mọi domain
 */
export interface BaseListingItem {
    /** URL đến detail page */
    itemUrl: string;

    /** ID nếu extract được */
    itemId?: string;

    /** Title preview */
    title?: string;

    /** Thumbnail/preview image */
    thumbnailUrl?: string;

    /** Bất kỳ preview data nào */
    previewData?: Record<string, unknown>;
}

/**
 * Page types - extensible enum-like
 */
export const PageTypes = {
    // Universal types
    LISTING: 'LISTING',           // List/search/category page
    DETAIL: 'DETAIL',             // Detail/content page
    SITEMAP: 'SITEMAP',           // Sitemap
    INDEX: 'INDEX',               // Index/home page

    // E-commerce specific
    PRODUCT: 'PRODUCT',
    CART: 'CART',
    CHECKOUT: 'CHECKOUT',

    // News specific
    ARTICLE: 'ARTICLE',
    CATEGORY: 'CATEGORY',

    // Social specific
    PROFILE: 'PROFILE',
    POST: 'POST',
    FEED: 'FEED',

    // Jobs specific
    JOB_LISTING: 'JOB_LISTING',
    COMPANY: 'COMPANY',

    // Files specific
    FILE: 'FILE',
} as const;

export type PageType = typeof PageTypes[keyof typeof PageTypes] | string;

/**
 * Extraction result - generic container
 */
export interface ExtractionResult<T extends BaseCrawlData = BaseCrawlData> {
    success: boolean;
    data?: T;
    multipleData?: T[];  // For pages with multiple items (e.g., one file per document)
    listingItems?: BaseListingItem[];
    nextPageUrl?: string;
    hasMorePages?: boolean;
    error?: string;
    metadata?: Record<string, unknown>;
}