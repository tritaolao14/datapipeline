// ============================================================
// BIGW.SELECTOR.TS - BigW site configuration
// ============================================================

import { createSiteConfig, SiteConfig } from '../../../core/base-selector';

export const bigwConfig: SiteConfig = createSiteConfig({
    siteName: 'bigw',
    displayName: 'BigW Australia',
    baseUrl: 'https://www.bigw.com.au',
    domain: 'bigw.com.au',

    selectors: {
        // Listing page
        itemCard: '[data-testid="product-tile"], .product-tile, .ProductTile',
        itemLink: '[data-testid="product-tile"] a, .product-tile a',
        itemUrlGlobs: ['**/p/**'],
        itemUrlRegex: /\/p\/[\w-]+\/p\/\d+/,

        // Optional listing preview
        listingTitle: '[data-testid="product-title"], .ProductTitle',
        listingPrice: '[data-testid="product-price"], .ProductPrice',
        listingImage: '[data-testid="product-image"] img',

        // Pagination
        nextPageSelector: '[data-testid="pagination-next"], .Pagination-next',
        loadMoreButton: '[data-testid="load-more"], button:has-text("Load More")',
        noMoreResultsIndicator: '[data-testid="no-results"], .NoResults',
        loadingIndicator: '[data-testid="loading"], .Loading',

        // Detail page
        detailTitle: '[data-testid="product-name"], h1.ProductName, .pdp-product-name h1',
        detailDescription: '[data-testid="product-description"], .ProductDescription',
        detailImages: '[data-testid="product-gallery"] img, .ProductGallery img, .pdp-gallery img',
        breadcrumbs: '[data-testid="breadcrumb"] a, .Breadcrumb a',

        // E-commerce specific (in custom)
        custom: {
            price: '[data-testid="product-price"], .ProductPrice, .pdp-price',
            originalPrice: '[data-testid="was-price"], .WasPrice, .pdp-was-price',
            brand: '[data-testid="brand"], .Brand, .pdp-brand',
            sku: '[data-testid="sku"], .SKU',
            rating: '[data-testid="rating"], .Rating',
            reviewCount: '[data-testid="review-count"], .ReviewCount',
            inStock: '[data-testid="in-stock"], .InStock',
            outOfStock: '[data-testid="out-of-stock"], .OutOfStock',
            deliveryInfo: '[data-testid="delivery"], .DeliveryInfo',
            specifications: '[data-testid="specifications"] tr, .Specifications tr',
        },

        // Block detection
        captchaSelector: '#captcha, .g-recaptcha, [data-testid="captcha"]',
        blockedSelector: '.access-denied, .blocked-page',
    },

    paginationType: 'infinite_scroll',

    infiniteScrollConfig: {
        maxScrolls: 30,
        scrollDelay: 1500,
        itemSelector: '[data-testid="product-tile"], .product-tile',
        scrollTimeout: 30000,
    },

    // Timing
    defaultTimeout: 30000,
    requestDelay: 1000,
    postLoadDelay: 1000,

    // Options
    requiresJavaScript: true,
    hasLazyLoadImages: true,
    locale: 'en-AU',
    currency: 'AUD',

    blockedStatusCodes: [403, 429, 503],
    blockedBodyKeywords: ['access denied', 'blocked', 'captcha'],
});

