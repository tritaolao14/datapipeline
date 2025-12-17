// ============================================================
// CRAWLER.TYPE.TS - Generic crawler types
// ============================================================

import { AdaptivePlaywrightCrawlerContext } from 'crawlee';
import { PageType, BaseCrawlData, BaseListingItem } from './crawl-data.type';

/**
 * User data cho Crawlee Request - Generic
 */
export interface CrawlerUserData {
    /** Page type */
    pageType?: PageType;

    /** Domain */
    domain?: string;

    /** Pagination */
    pageNumber?: number;

    /** Parent/source URL */
    sourceUrl?: string;

    /** Category/context path */
    contextPath?: string[];

    /** Custom data */
    custom?: Record<string, unknown>;
}

/**
 * Typed Crawling Context
 */
export type TypedCrawlingContext = AdaptivePlaywrightCrawlerContext<CrawlerUserData>;

/**
 * Crawler configuration - Generic
 */
export interface CrawlerConfig {
    // ─────────────────────────────────────────────────────────
    // Required
    // ─────────────────────────────────────────────────────────
    /** Domain identifier */
    domain: string;

    /** Starting URLs */
    startUrls: Array<{
        url: string;
        pageType?: PageType;
        metadata?: Record<string, unknown>;
    }>;

    // ─────────────────────────────────────────────────────────
    // Crawlee Native Configs
    // ─────────────────────────────────────────────────────────
    maxRequestsPerCrawl?: number;
    minConcurrency?: number;
    maxConcurrency?: number;
    maxRequestRetries?: number;
    requestHandlerTimeoutSecs?: number;
    navigationTimeoutSecs?: number;

    // ─────────────────────────────────────────────────────────
    // Proxy & Session
    // ─────────────────────────────────────────────────────────
    proxyUrls?: string[];
    tieredProxyUrls?: string[][];
    maxSessionPoolSize?: number;
    persistCookiesPerSession?: boolean;

    // ─────────────────────────────────────────────────────────
    // Pagination & Limits
    // ─────────────────────────────────────────────────────────
    maxPagesPerListing?: number;
    maxItemsPerListing?: number;

    // ─────────────────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────────────────
    datasetName?: string;
    keyValueStoreName?: string;

    // ─────────────────────────────────────────────────────────
    // Output Options
    // ─────────────────────────────────────────────────────────
    /** Output format */
    outputFormat?: 'json' | 'csv' | 'parquet';

    /** Include HTML snapshots */
    includeHtmlSnapshots?: boolean;

    /** Download media files */
    downloadMedia?: boolean;
}

/**
 * Crawl session statistics
 */
export interface CrawlStats {
    domain: string;
    sessionId: string;
    startTime: string;
    endTime?: string;
    durationMs?: number;

    // Request stats
    requestsTotal: number;
    requestsFinished: number;
    requestsFailed: number;
    requestsRetried: number;

    // Data stats
    itemsExtracted: number;
    pagesProcessed: Record<PageType, number>;

    // Errors
    errors: Array<{
        url: string;
        error: string;
        timestamp: string;
    }>;
}