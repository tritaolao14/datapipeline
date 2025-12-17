// ============================================================
// BASE-COLLECTOR.TS - Generic collector supporting any domain
// ============================================================

import { 
    PlaywrightCrawler, 
    createPlaywrightRouter,
    CheerioCrawler,
    Dataset,
    Request,
    ProxyConfiguration,
    Log,
    AdaptivePlaywrightCrawler,
    AdaptivePlaywrightCrawlerContext,
    PlaywrightCrawlingContext,
    Router,
} from 'crawlee';
import { load } from 'cheerio';
import { 
    BaseCrawlData,
    BaseListingItem,
    PageType,
    PageTypes,
} from '../../../shared/types/core/crawl-data.type';
import { 
    CrawlerConfig, 
    CrawlerUserData,
    TypedCrawlingContext,
    CrawlStats
} from '../../../shared/types/core/crawler.type';
import { BaseStrategy } from './base-strategy';
import { SiteConfig } from './base-selector';

/**
 * Generic Collector - works with ANY domain
 * 
 * Features:
 * - Domain-agnostic core logic
 * - Pluggable extraction strategies
 * - Flexible page type handling
 * - Full Crawlee feature utilization
 */
export class GenericCollector<
    TData extends BaseCrawlData = BaseCrawlData,
    TListingItem extends BaseListingItem = BaseListingItem
> {
    private strategy: BaseStrategy<TData, TListingItem>;
    private siteConfig: SiteConfig;
    private crawlerConfig: CrawlerConfig;
    private crawler: AdaptivePlaywrightCrawler | null = null;
    private log: Log;
    private stats: CrawlStats;
    
    constructor(
        strategy: BaseStrategy<TData, TListingItem>,
        siteConfig: SiteConfig,
        crawlerConfig: CrawlerConfig
    ) {
        this.strategy = strategy;
        this.siteConfig = siteConfig;
        this.crawlerConfig = crawlerConfig;
        this.log = new Log({ prefix: `[${crawlerConfig.domain}:${siteConfig.siteName}]` });
        
        this.stats = {
            domain: crawlerConfig.domain,
            sessionId: `${crawlerConfig.domain}_${siteConfig.siteName}_${Date.now()}`,
            startTime: new Date().toISOString(),
            requestsTotal: 0,
            requestsFinished: 0,
            requestsFailed: 0,
            requestsRetried: 0,
            itemsExtracted: 0,
            pagesProcessed: {},
            errors: [],
        };
    }
    
    /**
     * Run crawler
     */
    async run(): Promise<TData[]> {
        // TODO: Implement
        //
        // ─────────────────────────────────────────────────────────
        // Step 1: Create Router với DYNAMIC handlers
        // ─────────────────────────────────────────────────────────
        //
        const router = Router.create<TypedCrawlingContext>();
        
        // Register handler cho mỗi supported page type
        for (const pageType of this.strategy.supportedPageTypes) {
            //Logic xử lý dựa theo pageType được detected
            router.addHandler(pageType, async (ctx) => {
                await this.handlePage(ctx as TypedCrawlingContext, pageType);
            });
        }
        
        // Default handler - auto-detect page type
        router.addDefaultHandler(async (ctx) => {
            const pageContext = await this.strategy.detectPageType(
                ctx.request.url,
                ctx.page
            );
            await this.handlePage(ctx as TypedCrawlingContext, pageContext.pageType);
        });
        //
        // ─────────────────────────────────────────────────────────
        // Step 2: Create PlaywrightCrawler
        // ─────────────────────────────────────────────────────────
        this.crawler = new AdaptivePlaywrightCrawler({
            requestHandler: router,
            maxRequestsPerCrawl: this.crawlerConfig.maxRequestsPerCrawl,
            maxConcurrency: this.crawlerConfig.maxConcurrency,
            requestHandlerTimeoutSecs: this.crawlerConfig.requestHandlerTimeoutSecs,
            navigationTimeoutSecs: this.crawlerConfig.navigationTimeoutSecs,
        });
        //
        // ─────────────────────────────────────────────────────────
        // Step 3: Add start URLs với pageType
        // ─────────────────────────────────────────────────────────
        //
        const startRequests = this.crawlerConfig.startUrls.map(item => 
            new Request({
                url: item.url,
                userData: {
                    pageType: item.pageType || PageTypes.LISTING,
                    domain: this.crawlerConfig.domain,
                    pageNumber: 1,
                } as CrawlerUserData
            })
        );
        
        // Run crawler
        await this.crawler.run(startRequests);
        const results = await this.crawler.getData();
        return results.items as TData[];
    }
    
    /**
     * Generic page handler - delegates to strategy
     */
    private async handlePage(
        context: TypedCrawlingContext, 
        pageType: PageType
    ): Promise<void> {
        // TODO: Implement
        //
        const { page, request, enqueueLinks, pushData, log } = context;
        
        const pageContext = {
            pageType,
            confidence: 1,
            url: request.url,
            domain: this.crawlerConfig.domain,
            detectedBy: 'user_defined' as const,
        };
        
        // Check if this is a listing-type page
        const isListingPage = [
            PageTypes.LISTING,
            PageTypes.CATEGORY,
            PageTypes.INDEX,
            PageTypes.FEED,
        ].includes(pageType as any);
        
        if (isListingPage) {
            // ─────────────────────────────────────────────────────
            // Handle LISTING pages
            // ─────────────────────────────────────────────────────
            
            // 1. Handle dynamic loading (scroll/load more)
            await this.handleDynamicLoading(page);
            
            // 2. Extract listing items via strategy
            const result = await this.strategy.extractListingItems(page, pageContext);
            
            if (result.success && result.listingItems) {
                // 3. Enqueue detail pages
                for (const item of result.listingItems) {
                    await context.addRequests([new Request({
                        url: item.itemUrl,
                        userData: {
                            pageType: this.getDetailPageType(pageType),
                            domain: this.crawlerConfig.domain,
                            sourceUrl: request.url,
                        }
                    })]);
                }
                
                log.info(`Enqueued ${result.listingItems.length} items`);
            }
            
            // 4. Handle pagination
            const paginationInfo = await this.strategy.getPaginationInfo(page, pageContext);
            if (paginationInfo.hasNextPage && paginationInfo.nextPageUrl) {
                await context.addRequests([new Request({
                    url: paginationInfo.nextPageUrl,
                    userData: {
                        pageType,
                        domain: this.crawlerConfig.domain,
                        pageNumber: (request.userData.pageNumber || 1) + 1,
                    }
                })]);
            }
            
        } else {
            // ─────────────────────────────────────────────────────
            // Handle DETAIL pages
            // ─────────────────────────────────────────────────────
            
            const html = await page.content();
            const $ = load(html);
            
            const result = await this.strategy.extractDetailData($, request.url, pageContext);
            
            if (result.success && result.data) {
                // Validate
                const validation = this.strategy.validateData(result.data);
                if (!validation.valid) {
                    log.warning('Validation failed', { errors: validation.errors });
                }
                
                // Transform
                const transformed = this.strategy.transformData(result.data);
                
                // Save
                await pushData(transformed);
                this.stats.itemsExtracted++;
                
                log.info('Extracted data', { title: transformed.title });
            }
        }
        
        // Update stats
        this.stats.pagesProcessed[pageType] = 
            (this.stats.pagesProcessed[pageType] || 0) + 1;
    }
    
    /**
     * Map listing page type to detail page type
     */
    private getDetailPageType(listingType: PageType): PageType {
        const mapping: Record<string, PageType> = {
            [PageTypes.LISTING]: PageTypes.DETAIL,
            [PageTypes.CATEGORY]: PageTypes.PRODUCT,
            [PageTypes.FEED]: PageTypes.POST,
            // Add more mappings as needed
        };
        return mapping[listingType] || PageTypes.DETAIL;
    }
    
    /**
     * Handle dynamic loading based on site config
     */
    private async handleDynamicLoading(page: any): Promise<void> {
        // Delegate to site-specific logic from siteConfig
        // ... same as before
    }
}