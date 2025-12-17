// ============================================================
// BIGW.STRATEGY.TS - BigW-specific extraction strategy
// ============================================================

import { Page } from 'playwright';
import { CheerioAPI } from 'cheerio';
import { BaseStrategy, PaginationInfo } from '../../../core/base-strategy';
import { Product, ProductListingItem } from '../../../../../shared/types/domains/e-commerce/product.type';
import { ExtractionResult, PageTypes, PageType } from '../../../../../shared/types/core/crawl-data.type';
import { PageContext, PageDetectionRule } from '../../../../../shared/types/core/page-context.type';
import { bigwConfig } from './bigw.selector';

export class BigWStrategy extends BaseStrategy<Product, ProductListingItem> {
    readonly domain = 'ecommerce';

    readonly supportedPageTypes: PageType[] = [
        PageTypes.LISTING,
        PageTypes.PRODUCT,
        PageTypes.CATEGORY,
    ];

    readonly detectionRules: PageDetectionRule[] = [
        {
            pageType: PageTypes.PRODUCT,
            // FIX: BigW product URLs are like /product-name/p/123456
            urlPatterns: [/\/p\/\d+$/],
            urlContains: ['/p/'],
            urlExcludes: ['/c/'],  // Add exclusion for category pages
            priority: 100,
        },
        {
            pageType: PageTypes.LISTING,
            urlContains: ['/search'],
            urlExcludes: ['/p/'],
            priority: 50,
        },
        {
            pageType: PageTypes.CATEGORY,
            // BigW category URLs are like /c/800101
            urlPatterns: [/\/c\/\d+/],
            urlContains: ['/c/'],
            urlExcludes: ['/p/'],
            priority: 40,
        },
    ];



    constructor() {
        super(bigwConfig);
    }

    // ─────────────────────────────────────────────────────────────
    // LISTING PAGE EXTRACTION
    // ─────────────────────────────────────────────────────────────

    async extractListingItems(
        page: Page,
        context: PageContext
    ): Promise<ExtractionResult<never> & { listingItems: ProductListingItem[] }> {
        const listingItems: ProductListingItem[] = [];

        try {
            const $ = await this.getCheerio(page);
            const itemCards = $(this.config.selectors.itemCard);

            this.log.info(`Found ${itemCards.length} product tiles on page`);

            itemCards.each((_, card) => {
                const $card = $(card);

                // Get product URL
                const linkEl = $card.find('a').first();
                const href = linkEl.attr('href');

                if (!href) return;

                const itemUrl = this.normalizeUrl(href, this.config.baseUrl);

                // Extract preview data
                const title = $card.find(this.config.selectors.listingTitle || 'h3').text().trim();
                const priceText = $card.find(this.config.selectors.listingPrice || '.price').text();
                const thumbnailUrl = $card.find('img').attr('src') || $card.find('img').attr('data-src');

                listingItems.push({
                    itemUrl,
                    itemId: this.extractIdFromUrl(itemUrl, /\/p\/(\d+)/) || undefined,
                    title: title || undefined,
                    thumbnailUrl: thumbnailUrl ? this.normalizeUrl(thumbnailUrl, this.config.baseUrl) : undefined,
                    price: this.parsePrice(priceText) || undefined,
                });
            });

            this.log.info(`Extracted ${listingItems.length} product links`);

            return {
                success: true,
                listingItems,
            };

        } catch (error) {
            this.log.error('Failed to extract listing items', { error });
            return {
                success: false,
                listingItems: [],
                error: String(error),
            };
        }
    }

    // ─────────────────────────────────────────────────────────────
    // DETAIL PAGE EXTRACTION
    // ─────────────────────────────────────────────────────────────

    async extractDetailData(
        $: CheerioAPI,
        url: string,
        context: PageContext
    ): Promise<ExtractionResult<Product>> {
        try {
            const selectors = this.config.selectors;
            const custom = selectors.custom || {};

            // Extract basic info
            const title = this.extractText($, selectors.detailTitle);
            const description = this.extractText($, selectors.detailDescription || '');

            // Extract prices
            const currentPriceText = this.extractTextFromAny($,
                Array.isArray(custom.price) ? custom.price : [custom.price as string].filter(Boolean)
            );
            const originalPriceText = this.extractTextFromAny($,
                Array.isArray(custom.originalPrice) ? custom.originalPrice : [custom.originalPrice as string].filter(Boolean)
            );

            const currentPrice = this.parsePrice(currentPriceText);
            const originalPrice = this.parsePrice(originalPriceText);

            // Extract images
            const imageSelectors = Array.isArray(selectors.detailImages)
                ? selectors.detailImages.join(', ')
                : selectors.detailImages;
            const imageUrls = this.extractImageUrls($, imageSelectors, this.config.baseUrl);

            // Extract other fields
            const brand = this.extractTextFromAny($,
                Array.isArray(custom.brand) ? custom.brand : [custom.brand as string].filter(Boolean)
            );
            const categories = this.extractBreadcrumbs($, selectors.breadcrumbs || '');

            // Stock status
            const outOfStockEl = $(custom.outOfStock as string || '.out-of-stock');
            const inStock = outOfStockEl.length === 0;

            // Rating
            const ratingText = this.extractText($, custom.rating as string || '.rating');
            const rating = ratingText ? parseFloat(ratingText) : undefined;

            const reviewCountText = this.extractText($, custom.reviewCount as string || '.review-count');
            const reviewCount = reviewCountText ? parseInt(reviewCountText.replace(/\D/g, ''), 10) : undefined;

            // Extract ID from URL
            const sourceId = this.extractIdFromUrl(url, /\/p\/(\d+)/) || url;

            if (!title || currentPrice === null) {
                return {
                    success: false,
                    error: `Missing required fields: title=${!!title}, price=${currentPrice}`,
                };
            }

            const product: Product = {
                // Base fields
                sourceId,
                sourceUrl: url,
                sourceName: 'bigw',
                domain: 'ecommerce',
                title,
                description,
                imageUrls,
                categories,
                crawledAt: new Date().toISOString(),

                // E-commerce specific
                currentPrice,
                originalPrice: originalPrice || undefined,
                currency: 'AUD',
                discount: originalPrice && currentPrice < originalPrice
                    ? Math.round((1 - currentPrice / originalPrice) * 100)
                    : undefined,
                brand,
                inStock,
                rating,
                reviewCount,
            };

            this.log.info(`Extracted product: ${title} - $${currentPrice}`);

            return {
                success: true,
                data: product,
            };

        } catch (error) {
            this.log.error('Failed to extract detail data', { error, url });
            return {
                success: false,
                error: String(error),
            };
        }
    }

    // ─────────────────────────────────────────────────────────────
    // PAGINATION
    // ─────────────────────────────────────────────────────────────

    async getPaginationInfo(
        page: Page,
        context: PageContext
    ): Promise<PaginationInfo> {
        try {
            const nextSelector = this.config.selectors.nextPageSelector;

            if (!nextSelector) {
                return { hasNextPage: false };
            }

            const nextButton = await page.$(nextSelector);

            if (!nextButton) {
                return { hasNextPage: false };
            }

            const isDisabled = await nextButton.getAttribute('disabled');
            const href = await nextButton.getAttribute('href');

            return {
                hasNextPage: !isDisabled,
                nextPageUrl: href ? this.normalizeUrl(href, this.config.baseUrl) : undefined,
            };

        } catch (error) {
            this.log.warning('Failed to get pagination info', { error });
            return { hasNextPage: false };
        }
    }

    // Required abstract methods
    async extractWithCheerio($: CheerioAPI, url: string, context: PageContext) {
        return this.extractDetailData($, url, context);
    }

    async extractWithPlaywright(page: Page, url: string, context: PageContext) {
        const $ = await this.getCheerio(page);
        return this.extractDetailData($, url, context);
    }
}