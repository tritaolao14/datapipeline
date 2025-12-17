// ============================================================
// PRODUCT.TYPE.TS - E-commerce specific types
// Extends BaseCrawlData
// ============================================================

import { BaseCrawlData, BaseListingItem } from '../../core/crawl-data.type';

/**
 * E-commerce Product - extends generic BaseCrawlData
 */
export interface Product extends BaseCrawlData {
    domain: 'ecommerce';

    // ─────────────────────────────────────────────────────────
    // E-commerce Specific Fields
    // ─────────────────────────────────────────────────────────

    // Pricing
    currentPrice?: number;
    originalPrice?: number;
    currency?: string;
    discount?: number;

    // Product identifiers
    sku?: string;
    brand?: string;
    manufacturer?: string;

    // Availability
    inStock?: boolean;
    stockQuantity?: number;
    deliveryInfo?: string;

    // Reviews
    rating?: number;
    reviewCount?: number;

    // Specifications
    specifications?: Record<string, string>;
    variants?: ProductVariant[];
}

export interface ProductVariant {
    variantId?: string;
    name?: string;
    price?: number;
    inStock?: boolean;
    attributes: Record<string, string>;
}

export interface ProductListingItem extends BaseListingItem {
    price?: number;
    originalPrice?: number;
    rating?: number;
    inStock?: boolean;
}