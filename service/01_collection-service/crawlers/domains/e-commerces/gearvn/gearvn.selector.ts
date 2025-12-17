import { createSiteConfig, SiteConfig } from '../../../core/base-selector';

export const gearvnConfig: SiteConfig = createSiteConfig({
    siteName: 'gearvn',
    displayName: 'GearVN',
    baseUrl: 'https://gearvn.com',
    domain: 'ecommerce',

    selectors: {
        // listing page selectors
        itemCard: 'a.aspect-ratio.fade-box[href*="/products/"]',
        itemLink: 'a.aspect-ratio.fade-box[href*="/products/"]',
        itemUrlGlobs: ['**/products/**'],
        itemUrlRegex: /\/products\/[\w-]+/,
        listingTitle: 'a[href*="/products/"]:not(.aspect-ratio)',
        listingUrlGlobs: ['**/collections/**'],
        listingPrice: '.product-price, .price',
        listingCategory: '.collection-product',


        // detail page selectors
        // title
        detailTitle: 'h1.title, .product-name',

        // price selectors
        detailPrice: '.product-prices .price',
        detailOriginalPrice: '.product-prices .compare-price, .product-prices del',
        detailDiscount: '.product-prices .save-price .save-price__value',

        // images
        detailImages: 'a[data-fancybox="gallery"] img',

        // product info
        detailSku: 'span.sku-product, div.product-sku > span',
        detailStock: 'div.product-status > span',

        // description
        detailDescription: '.product-summary__item, div#tab-1, .product-description',
        detailSpecifications: 'div#tab-2 table',

        // navigation
        detailBreadcrumbs: 'ul.breadcrumb > li > a',

        // reviews
        detailReviews: 'div#customers-rating, div.product-reviews',
    },

    paginationType: 'load_more_button',
    loadMoreButtonConfig: {
        selector: ['.btn-more', 'a.btn-more'],
    },
});