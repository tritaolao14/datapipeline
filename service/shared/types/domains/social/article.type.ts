// ============================================================
// ARTICLE.TYPE.TS - News/Blog specific types
// ============================================================

import { BaseCrawlData, BaseListingItem } from '../../core/crawl-data.type';

export interface Article extends BaseCrawlData {
    domain: 'news';
    
    // ─────────────────────────────────────────────────────────
    // News Specific Fields
    // ─────────────────────────────────────────────────────────
    
    // Content
    headline: string;
    subheadline?: string;
    body: string;
    summary?: string;
    
    // Attribution
    authors: string[];
    source?: string;
    agency?: string;
    
    // Classification
    section?: string;
    topics?: string[];
    keywords?: string[];
    
    // Engagement
    commentCount?: number;
    shareCount?: number;
    viewCount?: number;
    
    // Related
    relatedArticles?: string[];
}

export interface ArticleListingItem extends BaseListingItem {
    headline?: string;
    publishedAt?: string;
    author?: string;
    section?: string;
}