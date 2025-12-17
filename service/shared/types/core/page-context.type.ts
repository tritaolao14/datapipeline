// ============================================================
// PAGE-CONTEXT.TYPE.TS - Page type detection và routing
// ============================================================

import { PageType } from './crawl-data.type';

/**
 * Page detection rule
 * Dùng để auto-detect loại page
 */
export interface PageDetectionRule {
    /** Page type nếu match */
    pageType: PageType;

    /** URL patterns (regex) */
    urlPatterns?: RegExp[];

    /** URL must contain */
    urlContains?: string[];

    /** URL must NOT contain */
    urlExcludes?: string[];

    /** Selector phải tồn tại trên page */
    requiredSelectors?: string[];

    /** Selector KHÔNG được tồn tại */
    excludedSelectors?: string[];

    /** Priority - higher = check first */
    priority?: number;
}

/**
 * Page context - thông tin về page đang process
 */
export interface PageContext {
    /** Detected page type */
    pageType: PageType;

    /** Confidence score (0-1) */
    confidence: number;

    /** URL */
    url: string;

    /** Domain */
    domain: string;

    /** Detection method */
    detectedBy: 'url_pattern' | 'selector' | 'content_analysis' | 'user_defined';

    /** Additional context */
    metadata?: Record<string, unknown>;
}

/**
 * Domain configuration
 */
export interface DomainConfig {
    /** Domain identifier */
    domainId: string;

    /** Domain name */
    domainName: string;

    /** Supported page types */
    supportedPageTypes: PageType[];

    /** Page detection rules */
    detectionRules: PageDetectionRule[];

    /** Flow definition: which page types lead to which */
    pageFlow?: Record<PageType, PageType[]>;
}