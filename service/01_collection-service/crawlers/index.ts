// ============================================================
// INDEX.TS - Multi-domain factory
// ============================================================

import { GenericCollector } from './core/base-collector';
import { BaseStrategy } from './core/base-strategy';
import { SiteConfig } from './core/base-selector';
import { CrawlerConfig } from '../../shared/types/core/crawler.type';
import { BaseCrawlData, BaseListingItem } from '../../shared/types/core/crawl-data.type';

// Domain registries
import { ECOMMERCE_SITES } from './domains/e-commerces';
//import { NEWS_SITES } from './domains/news';
// import { JOBS_SITES } from './domains/jobs';

/**
 * Site entry trong registry
 */
interface SiteEntry<T extends BaseCrawlData, L extends BaseListingItem> {
    strategy: new () => BaseStrategy<T, L>;
    config: SiteConfig;
    domain: string;
}

/**
 * All registered sites
 */
const SITE_REGISTRY: Record<string, SiteEntry<any, any>> = {
    ...ECOMMERCE_SITES,
    //...NEWS_SITES,
    // ...JOBS_SITES,
};

/**
 * Create collector for any registered site
 * 
 * @example
 * // E-commerce
 * const collector = createCollector('bigw', {
 *     domain: 'ecommerce',
 *     startUrls: [{ url: 'https://bigw.com.au/search?q=laptop' }],
 * });
 * 
 * // News
 * const newsCollector = createCollector('bbc', {
 *     domain: 'news',
 *     startUrls: [{ url: 'https://bbc.com/news' }],
 * });
 */
export function createCollector<
    T extends BaseCrawlData = BaseCrawlData,
    L extends BaseListingItem = BaseListingItem
>(
    siteName: string,
    config: CrawlerConfig
): GenericCollector<T, L> {
    const site = SITE_REGISTRY[siteName.toLowerCase()];

    if (!site) {
        const available = Object.keys(SITE_REGISTRY).join(', ');
        throw new Error(`Unknown site: ${siteName}. Available: ${available}`);
    }

    const strategy = new site.strategy();
    return new GenericCollector<T, L>(strategy, site.config, config);
}

/**
 * Get sites by domain
 */
export function getSitesByDomain(domain: string): string[] {
    return Object.entries(SITE_REGISTRY)
        .filter(([_, entry]) => entry.domain === domain)
        .map(([name]) => name);
}

/**
 * Get all available domains
 */
export function getAvailableDomains(): string[] {
    return [...new Set(Object.values(SITE_REGISTRY).map(e => e.domain))];
}