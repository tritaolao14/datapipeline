// ============================================================
// BASE-STRATEGY.TS - Base strategy class kết hợp extraction + scraping
// Cung cấp common functionality cho site-specific scrapers
// ============================================================

import { Page } from 'playwright';
import { CheerioAPI, load } from 'cheerio';
import { Log, AdaptivePlaywrightCrawler } from 'crawlee';
import {
    SiteConfig,
    SiteSelectors,
} from './base-selector';
import {
    BaseCrawlData,
    BaseListingItem,
    ExtractionResult,
    PageType,
} from '../../../shared/types/core/crawl-data.type';
import {
    PageContext,
    PageDetectionRule
} from '../../../shared/types/core/page-context.type';

// ═══════════════════════════════════════════════════════════════
// SUPPORTING TYPES
// ═══════════════════════════════════════════════════════════════

export interface PaginationInfo {
    hasNextPage: boolean;
    nextPageUrl?: string;
    currentPage?: number;
    totalPages?: number;
    totalItems?: number;
}

export interface ValidationResult {
    valid: boolean;
    errors?: string[];
    warnings?: string[];
}

// ═══════════════════════════════════════════════════════════════
// BASE STRATEGY CLASS
// ═══════════════════════════════════════════════════════════════

/**
 * Base Strategy Class
 * 
 * Kết hợp:
 * - Extraction logic (từ ExtractionStrategy)
 * - Pagination handling (infinite scroll, load more, next page)
 * - Block/captcha detection
 * - Common utilities (URL normalization, price parsing, etc.)
 * 
 * Site-specific scrapers sẽ extend class này và:
 * - Define abstract properties (domain, supportedPageTypes, detectionRules)
 * - Implement abstract methods (extractListingItems, extractDetailData)
 * - Override other methods nếu cần custom logic
 */
export abstract class BaseStrategy<
    TData extends BaseCrawlData = BaseCrawlData,
    TListingItem extends BaseListingItem = BaseListingItem
> {
    protected config: SiteConfig;
    protected selectors: SiteSelectors;
    protected log: Log;

    // ═══════════════════════════════════════════════════════════
    // ABSTRACT PROPERTIES - Subclass MUST define
    // ═══════════════════════════════════════════════════════════

    abstract readonly domain: string;
    abstract readonly supportedPageTypes: PageType[];
    abstract readonly detectionRules: PageDetectionRule[];

    // ═══════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════

    constructor(config: SiteConfig) {
        this.config = config;
        this.selectors = config.selectors;
        this.log = new Log({ prefix: `[${config.domain}:${config.siteName}]` });

        if (!config)
            throw new Error('SiteConfig is required');
        if (!config.selectors)
            throw new Error('SiteSelectors is required');
    }

    // ═══════════════════════════════════════════════════════════
    // ABSTRACT METHODS - Subclass MUST implement
    // ═══════════════════════════════════════════════════════════

    abstract extractListingItems(
        page: Page,
        context: PageContext
    ): Promise<ExtractionResult<never> & { listingItems: TListingItem[] }>;

    abstract extractDetailData(
        $: CheerioAPI,
        url: string,
        context: PageContext
    ): Promise<ExtractionResult<TData>>;

    // ═══════════════════════════════════════════════════════════
    // PAGE TYPE DETECTION - Default implementation, can override
    // ═══════════════════════════════════════════════════════════

    //need review
    async detectPageType(url: string, page?: Page): Promise<PageContext> {
        //distinguish listing/category and detail type page.
        for (const rule of this.detectionRules) {
            const result = await this.matchDetectionRule(rule, url, page);
            if (!result) continue;
            const { confidence, detectedBy } = result;
            if (confidence > 0.5) {
                return {
                    pageType: rule.pageType,
                    confidence,
                    url,
                    domain: this.config.domain,
                    detectedBy: detectedBy || 'unknown'
                } as PageContext;
            }
        }
        return {} as PageContext; //object pageContext đang thiếu các fields cần thiết.
    }

    protected async matchDetectionRule(
        rule: PageDetectionRule,
        url: string,
        page?: Page
    ): Promise<{ confidence: number; detectedBy: PageContext['detectedBy'] } | null> {
        //kiểm tra url có chứa ngoại lệ không, nếu có trả về null ngay lập tức (check exclusions)
        for (const exclude in rule.urlExcludes) {
            if (url.includes(exclude)) return null;
        }
        if (page && rule.excludedSelectors && rule.excludedSelectors.length > 0) {
            for (const selector of rule.excludedSelectors) {
                try {
                    const element = await page.$(selector);
                    if (element) return null; //tìm thấy excluded selector -> không match rule này
                } catch (error) {
                    continue; //bỏ qua error từ các selectors không hợp lệ
                }
            }
        }
        //kiểm tra pattern của url
        for (const pattern of rule.urlPatterns || []) {
            if (pattern.test(url))
                return { confidence: 0.9, detectedBy: 'url_pattern' };
        }
        //kiểm tra url string
        for (const contains of rule.urlContains || []) {
            if (url.includes(contains))
                return { confidence: 0.8, detectedBy: 'url_pattern' };
        }
        //kiểm tra các selectors cần có
        if (page && rule.requiredSelectors && rule.requiredSelectors.length > 0) {
            for (const selector of rule.requiredSelectors) {
                try {
                    const element = await page.$(selector);
                    if (element) return { confidence: 0.8, detectedBy: 'selector' };
                    if (!element) return null; //không tìm thấy required selector -> không match rule này
                } catch (error) {
                    continue; //bỏ qua error từ các selectors không hợp lệ
                }
            }
        }
        return null; //không match rule nào -> trả về null
    }

    // ═══════════════════════════════════════════════════════════
    // PAGINATION INFO - Default implementation, can override
    // ═══════════════════════════════════════════════════════════

    async getPaginationInfo(
        page: Page,
        context: PageContext
    ): Promise<PaginationInfo> {
        //kiểm tra xem trang có trang tiếp theo không
        //ví dụ: có nút "Load More", "Xem thêm", "Trang sau", etc.
        //nếu cần custom logic, có thể override method này trong subclass
        //ví dụ: check if there is a "Load More" button, check if there is a "Next Page" button, etc.
        return { hasNextPage: false };
    }

    // ═══════════════════════════════════════════════════════════
    // VALIDATION - Default implementation, can override
    // ═══════════════════════════════════════════════════════════

    validateData(data: TData): ValidationResult {
        //kiểm tra xem data có hợp lệ không
        //ví dụ: required fields, formats, etc.
        //nếu cần custom logic, có thể override method này trong subclass
        //ví dụ: check if price is valid, check if image urls are valid, etc.
        return { valid: true };
    }

    // ═══════════════════════════════════════════════════════════
    // TRANSFORMATION - Default implementation, can override
    // ═══════════════════════════════════════════════════════════

    transformData(data: TData): TData {
        //clean/normalize data trước khi lưu
        //ví dụ: remove html tags, trim whitespace, convert currency, etc.
        //nếu cần custom logic, có thể override method này trong subclass
        //ví dụ: convert price to number, remove non-ascii characters, etc.
        return data;
    }

    // ═══════════════════════════════════════════════════════════
    // PAGINATION HANDLERS - Default implementation, can override
    // ═══════════════════════════════════════════════════════════

    async handlePagination(page: Page): Promise<number> {
        return 0;
    }

    async handleInfiniteScroll(page: Page): Promise<number> {
        return 0;
    }

    async handleLoadMoreButton(page: Page): Promise<number> {
        return 0;
    }

    getNextPageUrl(currentUrl: string, pageNumber: number): string | null {
        return null;
    }

    async hasNextPageLink(page: Page): Promise<boolean> {
        return false;
    }

    async getNextPageLinkUrl(page: Page): Promise<string | null> {
        return null;
    }

    async getCurrentItemCount(page: Page): Promise<number> {
        return 0;
    }

    // ═══════════════════════════════════════════════════════════
    // BLOCK / CAPTCHA DETECTION
    // ═══════════════════════════════════════════════════════════

    async checkBlockedOrCaptcha(page: Page): Promise<void> {
        //kiểm tra xem trang có bị blocked hay không
        return;
    }

    // ═══════════════════════════════════════════════════════════
    // CHEERIO EXTRACTION UTILITIES
    // ═══════════════════════════════════════════════════════════

    protected extractText($: CheerioAPI, selector: string): string | undefined {
        try {
            const element = $(selector).first();
            const text = element.text().trim();
            return text;
        } catch (error) {
            return undefined;
        }
    }

    protected extractTextFromAny($: CheerioAPI, selectors: string[]): string | undefined {
        for (const selector of selectors) {
            const text = this.extractText($, selector);
            if (text) return text;
        }
        return undefined;
    }

    protected extractAttr(
        $: CheerioAPI,
        selector: string,
        attr: string
    ): string | undefined {
        try {
            const element = $(selector).first();
            const attrValue = element.attr(attr);
            return attrValue;
        } catch (error) {
            return undefined;
        }
    }

    protected extractAttrFromAny(
        $: CheerioAPI,
        selectors: string[],
        attr: string
    ): string | undefined {
        for (const selector of selectors) {
            const attrValue = this.extractAttr($, selector, attr);
            if (attrValue) return attrValue;
        }
        return undefined;
    }

    //need to review
    protected extractAll<T = string>(
        $: CheerioAPI,
        selector: string,
        extractor: (el: ReturnType<CheerioAPI>) => T | undefined
    ): T[] {
        const results: T[] = []; //khởi tạo mảng results để lưu kết quả
        $(selector).each((index, element) => {
            const $el = $(element);
            const value = extractor($el);
            if (value !== undefined && value !== null && value !== '') {
                results.push(value);
            }
        });
        return results;
    }

    protected extractImageUrls(
        $: CheerioAPI,
        selector: string,
        baseUrl: string
    ): string[] {
        const imageUrls: string[] = [];
        const seen = new Set<string>(); //set để tránh duplicate urls
        $(selector).each((_, element) => {
            const $el = $(element);
            const src = $el.attr('src') || $el.attr('data-src');
            if (src && !seen.has(src)) {
                seen.add(src);
                imageUrls.push(this.normalizeUrl(src, baseUrl));
            }
        });
        return imageUrls;

    }

    protected extractBreadcrumbs($: CheerioAPI, selector: string): string[] {
        const breadcrumbs: string[] = [];
        try {
            $(selector).each((_, element) => {
                const text = $(element).text().trim();
                if (text) {
                    breadcrumbs.push(text);
                }
            });
        } catch (error) {
            this.log.warning('Failed to extract breadcrumbs', { error });
        }
        return breadcrumbs;
    }

    // ═══════════════════════════════════════════════════════════
    // GENERAL UTILITIES
    // ═══════════════════════════════════════════════════════════

    protected async getCheerio(page: Page): Promise<CheerioAPI> {
        const html = await page.content();
        return load(html);
    }

    protected normalizeUrl(url: string | undefined | null, baseUrl?: string): string {
        //nếu không co url thì trả về empty string
        if (!url) return '';

        //loại bỏ whitespace và các ký tự không hợp lệ
        url = url.trim();

        //nếu url đã bắt đầu bằng https:// hoặc http:// thì trả về url đó
        if (url.startsWith('https://') || url.startsWith('http://')) return url;
        if (url.startsWith('//')) return `https:${url}`;

        //nếu không có baseUrl thì sử dụng baseUrl từ config
        if (!baseUrl) {
            baseUrl = this.config?.baseUrl || '';
        }

        const cleanedBaseUrl = baseUrl.replace(/\/$/, '');

        if (url.startsWith('/')) {
            return `${cleanedBaseUrl}${url}`;
        }

        return `${cleanedBaseUrl}/${url}`;
    }

    protected parsePrice(priceString: string | null | undefined): number | null {
        // 1. Nếu không có → return null
        if (!priceString) return null;

        // 2. Clean: chỉ giữ số, dấu chấm, dấu phẩy
        const cleaned = priceString.replace(/[^\d.,]/g, '').trim();
        if (!cleaned) return null;

        let normalized = cleaned;

        // 3. Xác định decimal separator
        const lastComma = cleaned.lastIndexOf(',');
        const lastDot = cleaned.lastIndexOf('.');

        // Case A: Có cả '.' và ','
        if (lastComma > -1 && lastDot > -1) {
            if (lastComma > lastDot) {
                // Format Châu Âu: 1.234,56
                // '.' là thousands, ',' là decimal
                normalized = cleaned.replace(/\./g, '').replace(',', '.');
            } else {
                // Format US: 1,234.56
                // ',' là thousands, '.' là decimal
                normalized = cleaned.replace(/,/g, '');
            }
        }
        // Case B: Chỉ có ','
        else if (lastComma > -1) {
            const parts = cleaned.split(',');
            // Nếu phần sau ',' có ≤2 ký tự → ',' là decimal
            if (parts.length === 2 && parts[1].length <= 2) {
                // 1234,56 → 1234.56
                normalized = cleaned.replace(',', '.');
            } else {
                // 1,234,567 → 1234567
                normalized = cleaned.replace(/,/g, '');
            }
        }
        // Case C: Chỉ có '.' hoặc không có → giữ nguyên
        // normalized đã = cleaned

        // 4. Parse và return
        const num = parseFloat(normalized);

        // 5. Nếu NaN → return null
        return isNaN(num) ? null : num;
    }

    protected isValidItemUrl(url: string): boolean {
        return false;
    }

    protected extractIdFromUrl(url: string, pattern?: RegExp): string | null {
        return null;
    }

    async waitForPageReady(page: Page): Promise<void> {
        return;
    }

    async triggerLazyLoad(page: Page): Promise<void> {
        return;
    }

    // ═══════════════════════════════════════════════════════════
    // GETTERS
    // ═══════════════════════════════════════════════════════════

    // getConfig(): SiteConfig {
    //     return this.config;
    // }

    // getSelectors(): SiteSelectors {
    //     return this.selectors;
    // }

    // getSiteName(): string {
    //     return this.config.siteName;
    // }

    // getBaseUrl(): string {
    //     return this.config.baseUrl;
    // }
}