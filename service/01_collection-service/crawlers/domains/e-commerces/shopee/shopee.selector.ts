
import { SiteConfig } from '../../../core/base-selector';

export const shopeeConfig: SiteConfig = {
    domain: 'shopee.vn',
    siteName: 'Shopee',
    baseUrl: 'https://shopee.vn',

    // Use URL pagination: ?page=0, ?page=1, ...
    paginationType: 'url_pagination',
    urlPaginationConfig: {
        paramName: 'page',      // URL parameter name
        startValue: 0,          // Shopee starts from page 0
        increment: 1,           // Increment by 1 for each page
        maxValue: 100,          // Max 100 pages to avoid infinite loops
    },

    customCookies: process.env.SHOPEE_COOKIES
        ? process.env.SHOPEE_COOKIES.split(';').map(c => {
            const [name, ...valueParts] = c.trim().split('=');
            return { name, value: valueParts.join('=') };
        })
        : [],

    selectors: {
        // ========================================
        // LISTING PAGE SELECTORS (Search Results)
        // ========================================

        // Item card selector (each product in search results)
        itemCard: 'li.shopee-search-item-result__item',

        // Product link - the main anchor tag
        itemLink: 'a.contents',

        // Title - inside line-clamp div, may have flag-label img before text
        listingTitle: 'div.line-clamp-2.break-words',
        listingImage: 'img[alt]', // Get thumbnail image + alt text as fallback title

        // Price - main price display
        listingPrice: 'span.truncate.text-base\\/5.font-medium',

        // ========================================
        // DETAIL PAGE SELECTORS
        // ========================================

        // Title - prefer meta tags as they are more stable
        detailTitle: 'span.zmdJz8', // Product title on detail page
        detailSubtitle: 'meta[property="og:title"]', // Fallback from meta tags

        // Images - multiple selectors to try
        detailImages: [
            'img.uXN1L5', // Main product images with lazyload
            'img[elementtiming="shopee:heroComponentPaint"]', // Hero images
            '.nCumMD img', // Gallery images
            'img[alt*="Product image"]', // Images with product alt text
        ],

        // Price information
        detailPrice: 'div.rMge0Y', // Current price
        detailOriginalPrice: 'div.DhxY1u', // Original price (if discounted)
        detailDiscount: 'div.yiMptB', // Discount percentage

        // Product info
        detailDescription: 'div.Ugqa7M', // Product description section
        detailSku: 'div[class*="sku"]', // SKU if available

        // Additional info
        detailBreadcrumbs: 'div.EzdN1k a', // Breadcrumb navigation
        detailCategories: 'div.EzdN1k a', // Category links

        // ========================================
        // PAGINATION (for click-based pagination if needed)
        // ========================================

        nextPageSelector: '.shopee-page-controller__next-btn',

        // ========================================
        // CUSTOM SELECTORS (Additional data extraction)
        // ========================================

        custom: {
            // Listing page extra data
            discount: 'div.bg-shopee-pink span',                      // Discount percentage
            rating: 'div.text-shopee-black87.text-xs\\/sp14.flex-none', // Rating number
            soldCount: 'div.truncate.text-shopee-black87.text-xs',   // "Đã bán X"
            location: 'span.ml-\\[3px\\].align-middle',               // Location text
            voucher: 'div.truncate.bg-shopee-voucher-yellow',        // Voucher info
            thumbnail: 'img.inset-y-0.w-full.h-full',                // Product thumbnail

            // Detail page extra data
            priceMain: '.pqTWzA',
            soldCountDetail: '.P3CqwM',
        },

        // ========================================
        // URL PATTERNS (to detect product pages)
        // ========================================

        itemUrlRegex: /\/.*-i\.\d+\.\d+/,      // Format: name-i.shopId.itemId
        itemUrlGlobs: ['shopee.vn/*-i.*.*']
    }
};
