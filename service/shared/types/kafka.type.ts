// ============================================================
// KAFKA.TYPE.TS - Kafka message types
// Dùng để communicate giữa Collection Service và các services khác
// ============================================================

import { Product } from './domains/e-commerce/product.type';

/**
 * Kafka Topics
 */
export enum KafkaTopic {
    /** URLs cần crawl - input cho Collection Service */
    URL_REQUESTS = 'url-requests',

    /** Products đã crawl - output từ Collection Service */
    RAW_PRODUCTS = 'raw-products',

    /** Crawl status updates */
    CRAWL_STATUS = 'crawl-status',

    /**  */
}

/**
 * Message: URL request để crawl
 * Consumer: Collection Service
 */
export interface UrlRequestMessage {
    /** Unique message ID */
    messageId: string;

    /** Site to crawl */
    site: string;

    /** URLs to start crawling */
    urls: string[];

    /** Optional: Max products to collect */
    maxProducts?: number;

    /** Priority level */
    priority?: 'high' | 'normal' | 'low';

    /** Timestamp */
    createdAt: string;
}

/**
 * Message: Raw product collected
 * Producer: Collection Service
 * Consumer: Preprocessing Service
 */
export interface RawProductMessage {
    /** Message ID */
    messageId: string;

    /** Batch of products */
    products: Product[];

    /** Crawl session ID */
    sessionId: string;

    /** Batch metadata */
    batchNumber: number;
    totalBatches?: number;

    /** Timestamp */
    createdAt: string;
}

/**
 * Message: Crawl status update
 */
export interface CrawlStatusMessage {
    sessionId: string;
    status: 'started' | 'in_progress' | 'completed' | 'failed';
    stats?: {
        requestsFinished: number;
        requestsFailed: number;
        productsCollected: number;
    };
    error?: string;
    timestamp: string;
}