import { Page } from 'playwright';
import { CheerioAPI } from 'cheerio';
import { BaseStrategy, PaginationInfo } from '../../../core/base-strategy';
import { Product, ProductListingItem } from '../../../../../shared/types/domains/e-commerce/product.type';
import { ExtractionResult, PageTypes, PageType } from '../../../../../shared/types/core/crawl-data.type';
import { PageContext, PageDetectionRule } from '../../../../../shared/types/core/page-context.type';
import { gearvnConfig } from './gearvn.selector';
export class GearVNStrategy extends BaseStrategy<Product, ProductListingItem> {
    readonly domain = 'ecommerce';

    readonly supportedPageTypes: PageType[] = [
        PageTypes.LISTING,
        PageTypes.PRODUCT,
        PageTypes.CATEGORY,
    ];

    readonly detectionRules: PageDetectionRule[] = [
        {
            pageType: PageTypes.PRODUCT,
            urlPatterns: gearvnConfig.selectors.itemUrlRegex ? [gearvnConfig.selectors.itemUrlRegex] : [],
            urlContains: gearvnConfig.selectors.itemUrlGlobs,
            priority: 100,
        },
        {
            pageType: PageTypes.LISTING,
            urlContains: ['/search', '/c/', '/category', '/collections/'],
            urlExcludes: ['/p/'],
            priority: 50,
        },
        {
            pageType: PageTypes.CATEGORY,
            urlPatterns: [/\/c\/[\w-]+/],
            priority: 40,
        },
    ];
    constructor() {
        super(gearvnConfig);
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

                // Get product URL - card might be the link itself or contain a link
                let href = $card.attr('href'); // Try getting href from card directly (if card is an <a> tag)
                if (!href) {
                    // If card is not an <a> tag, find link inside
                    const linkEl = $card.find(this.config.selectors.itemLink).first();
                    href = linkEl.attr('href');
                }

                if (!href) return;

                const itemUrl = this.normalizeUrl(href, this.config.baseUrl);

                // Extract preview data - get title from card text or parent's sibling a tag
                let title = $card.attr('title') || $card.text().trim();
                if (!title && $card.is(this.config.selectors.itemCard)) {
                    // For GearVN, the title is in the next sibling <a> tag
                    title = $card.parent().find(this.config.selectors.listingTitle).first().text().trim();
                }

                const priceText = $card.parent().find(this.config.selectors.listingPrice).text();
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

    async extractDetailData(
        $: CheerioAPI,
        url: string,
        context: PageContext
    ): Promise<ExtractionResult<Product>> {
        try {
            const selectors = this.config.selectors;
            const custom = selectors.custom || {};
            const title = this.extractText($, selectors.detailTitle);
            const imageSelectors = Array.isArray(selectors.detailImages)
                ? selectors.detailImages.join(', ')
                : selectors.detailImages;
            const imageUrls = this.extractImageUrls($, imageSelectors, this.config.baseUrl);

            const sourceId = this.extractIdFromUrl(url, /\/p\/(\d+)/) || url;

            if (!title || imageUrls.length === 0) {
                return {
                    success: false,
                    error: `Missing required fields: title=${!!title}, imageUrls=${imageUrls.length}`,
                };
            }

            const product: Product = {
                sourceId,
                title,
                imageUrls,
                sourceUrl: url,
                sourceName: this.config.siteName,
                domain: 'ecommerce',
                crawledAt: new Date().toISOString(),

            }
            return {
                success: true,
                data: product,
            };
        } catch (error) {
            this.log.error('Failed to extract detail data', { error });
            return {
                success: false,
                data: undefined,
                error: String(error),
            };
        }
    }
}