
import { Page } from 'playwright';
import { CheerioAPI } from 'cheerio';
import { BaseStrategy, PaginationInfo } from '../../../core/base-strategy';
import { Product, ProductListingItem } from '../../../../../shared/types/domains/e-commerce/product.type';
import { ExtractionResult, PageTypes, PageType } from '../../../../../shared/types/core/crawl-data.type';
import { PageContext, PageDetectionRule } from '../../../../../shared/types/core/page-context.type';
import { shopeeConfig } from './shopee.selector';

export class ShopeeStrategy extends BaseStrategy<Product, ProductListingItem> {
    readonly domain = 'shopee.vn';

    readonly supportedPageTypes: PageType[] = [
        PageTypes.LISTING,
        PageTypes.PRODUCT,
        PageTypes.CATEGORY, // Often treated same as listing
    ];

    readonly detectionRules: PageDetectionRule[] = [
        {
            pageType: PageTypes.PRODUCT,
            urlPatterns: [/-i\.\d+\.\d+/], // Standard Shopee item pattern: name-i.shopId.itemId
            priority: 100,
        },
        {
            pageType: PageTypes.LISTING,
            urlContains: ['/search'],
            urlExcludes: [],
            priority: 50,
        },
        {
            pageType: PageTypes.CATEGORY,
            urlPatterns: [/^https:\/\/shopee\.vn\/[^\/]+-cat\.\d+/],
            priority: 40,
        },
    ];

    constructor() {
        super(shopeeConfig);
    }

    // ─────────────────────────────────────────────────────────────
    // OVERRIDES
    // ─────────────────────────────────────────────────────────────

    /**
     * Shopee uses lazy loading extensively on listing pages.
     * We need to scroll down to trigger all items to load.
     */
    async triggerLazyLoad(page: Page): Promise<void> {
        try {
            await page.evaluate(async () => {
                await new Promise<void>((resolve) => {
                    let totalHeight = 0;
                    const distance = 100;
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;

                        if (totalHeight >= scrollHeight) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);
                });
            });
            // Additional wait to ensure network requests finish
            await page.waitForTimeout(2000);
        } catch (error) {
            this.log.warning('Lazy load scroll failed', { error });
        }
    }

    // ─────────────────────────────────────────────────────────────
    // PAGINATION IMPLEMENTATION
    // ─────────────────────────────────────────────────────────────

    /**
     * Generate next page URL by incrementing the page parameter
     */
    public getNextPageUrl(currentUrl: string): string | null {
        try {
            const url = new URL(currentUrl);
            const config = this.config.urlPaginationConfig;

            if (!config) {
                this.log.warning('URL pagination config not found');
                return null;
            }

            // Get current page number
            const currentPageStr = url.searchParams.get(config.paramName);
            const currentPage = currentPageStr ? parseInt(currentPageStr, 10) : config.startValue;

            // Calculate next page
            const nextPage = currentPage + config.increment;

            // Check if we've reached max pages
            if (config.maxValue && nextPage > config.maxValue) {
                this.log.info('Reached max page limit', { nextPage, maxValue: config.maxValue });
                return null;
            }

            // Update URL with next page number
            url.searchParams.set(config.paramName, nextPage.toString());

            return url.toString();
        } catch (error) {
            this.log.error('Failed to generate next page URL', { error });
            return null;
        }
    }

    async getPaginationInfo(
        page: Page,
        context: PageContext
    ): Promise<PaginationInfo> {
        // For URL pagination, we check if there are results on the current page
        // If no items found, assume we've reached the end
        try {
            const $ = await this.getCheerio(page);
            const itemCount = $(this.config.selectors.itemCard).length;

            // If no items found on current page, no more pages
            if (itemCount === 0) {
                return { hasNextPage: false };
            }

            // Generate next page URL
            const nextPageUrl = this.getNextPageUrl(context.url);

            return {
                hasNextPage: !!nextPageUrl,
                nextPageUrl: nextPageUrl || undefined,
            };
        } catch (error) {
            this.log.error('Failed to get pagination info', { error });
            return { hasNextPage: false };
        }
    }

    async handlePagination(page: Page): Promise<number> {
        // For URL pagination, we don't click buttons
        // The crawler will navigate to nextPageUrl returned from getPaginationInfo
        // This method is not used for url_pagination type
        this.log.debug('handlePagination called but not needed for url_pagination');
        return 0;
    }

    // ─────────────────────────────────────────────────────────────
    // EXTRACTION IMPLEMENTATION
    // ─────────────────────────────────────────────────────────────

    async extractListingItems(
        page: Page,
        context: PageContext
    ): Promise<ExtractionResult<never> & { listingItems: ProductListingItem[] }> {
        const listingItems: ProductListingItem[] = [];

        try {
            // Trigger lazy load first to get all items
            await this.triggerLazyLoad(page);

            const $ = await this.getCheerio(page);
            const itemCards = $(this.config.selectors.itemCard);

            this.log.info(`Found ${itemCards.length} product cards`);

            itemCards.each((_, card) => {
                const $card = $(card);

                // Get product link
                const linkEl = $card.find(this.config.selectors.itemLink).first();
                const href = linkEl.attr('href');

                if (!href) return;

                const itemUrl = this.normalizeUrl(href, this.config.baseUrl);

                // Extract title (try multiple sources)
                let title = $card.find(this.config.selectors.listingTitle).text().trim();

                // Remove flag labels or badges from title
                // Shopee often has img with alt text before the actual title
                if (!title || title.length < 5) {
                    // Fallback: use image alt text
                    title = $card.find(this.config.selectors.listingImage).attr('alt') || '';
                }

                // Extract price
                const priceText = $card.find(this.config.selectors.listingPrice).text().trim();
                const price = this.parsePrice(priceText);

                // Extract discount percentage (optional)
                const discountText = $card.find(this.config.selectors.custom?.discount as string).text().trim();

                // Extract rating (optional)
                const ratingText = $card.find(this.config.selectors.custom?.rating as string).text().trim();
                const rating = ratingText ? parseFloat(ratingText) : undefined;

                // Extract sold count (optional)
                const soldText = $card.find(this.config.selectors.custom?.soldCount as string).text().trim();
                // soldText format: "Đã bán 1k+" or "Đã bán 55"
                // Extract the number part
                const soldMatch = soldText.match(/Đã bán\s+(.+)/);
                const soldCount = soldMatch ? soldMatch[1] : undefined;

                // Extract location (optional)
                const location = $card.find(this.config.selectors.custom?.location as string).text().trim();

                // Extract thumbnail image URL (optional)
                const thumbnail = $card.find(this.config.selectors.custom?.thumbnail as string).attr('src');

                // Build listing item with all available data
                const listingItem: ProductListingItem = {
                    itemUrl,
                    itemId: this.extractIdFromUrl(itemUrl, /-i\.\d+\.(\d+)/) || undefined,
                    title: title || undefined,
                    price: price || undefined,
                };

                // Add optional fields only if they have values
                if (thumbnail) {
                    (listingItem as any).thumbnail = thumbnail;
                }
                if (discountText) {
                    (listingItem as any).discount = discountText;
                }
                if (rating) {
                    (listingItem as any).rating = rating;
                }
                if (soldCount) {
                    (listingItem as any).soldCount = soldCount;
                }
                if (location) {
                    (listingItem as any).location = location;
                }

                listingItems.push(listingItem);
            });

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
            // ========================================
            // EXTRACT TITLE
            // ========================================

            // Try multiple sources for title (most reliable first)
            let title = $('meta[property="og:title"]').attr('content'); // Open Graph meta tag

            if (!title) {
                // Try selector-based extraction
                title = $(this.config.selectors.detailTitle).first().text().trim();
            }

            if (!title) {
                // Last fallback: page title
                title = $('title').text().trim();
            }

            // ========================================
            // EXTRACT IMAGES
            // ========================================

            const imagesSelector = Array.isArray(this.config.selectors.detailImages)
                ? this.config.selectors.detailImages.join(',')
                : this.config.selectors.detailImages;

            let imageUrls = this.extractImageUrls($, imagesSelector, this.config.baseUrl);

            // Shopee often uses srcset with higher resolution images
            // Try to extract from srcset as well
            if (imageUrls.length === 0) {
                const imgElements = $('img[srcset]');
                imgElements.each((_, elem) => {
                    const srcset = $(elem).attr('srcset');
                    if (srcset) {
                        // Parse srcset to get the highest resolution image
                        const sources = srcset.split(',').map(s => s.trim());
                        const highestRes = sources[sources.length - 1]; // Usually last is highest
                        const imageUrl = highestRes.split(' ')[0]; // Remove size descriptor

                        if (imageUrl && !imageUrls.includes(imageUrl)) {
                            imageUrls.push(this.normalizeUrl(imageUrl, this.config.baseUrl));
                        }
                    }
                });
            }

            // ========================================
            // EXTRACT PRICE
            // ========================================

            let price: number | undefined;
            let originalPrice: number | undefined;
            let discount: string | undefined;

            // Try to get current price
            if (this.config.selectors.detailPrice) {
                const priceText = $(this.config.selectors.detailPrice).first().text().trim();
                price = this.parsePrice(priceText) || undefined;
            }

            // Try to get original price (if there's a discount)
            if (this.config.selectors.detailOriginalPrice) {
                const originalPriceText = $(this.config.selectors.detailOriginalPrice).first().text().trim();
                originalPrice = this.parsePrice(originalPriceText) || undefined;
            }

            // Try to get discount percentage
            if (this.config.selectors.detailDiscount) {
                discount = $(this.config.selectors.detailDiscount).first().text().trim();
            }

            // ========================================
            // EXTRACT DESCRIPTION
            // ========================================

            let description: string | undefined;

            // Try meta description first
            description = $('meta[name="description"]').attr('content');

            if (!description && this.config.selectors.detailDescription) {
                description = $(this.config.selectors.detailDescription).first().text().trim();
            }

            // ========================================
            // EXTRACT BREADCRUMBS (for category info)
            // ========================================

            let categories: string[] = [];

            if (this.config.selectors.detailBreadcrumbs) {
                const breadcrumbLinks = $(this.config.selectors.detailBreadcrumbs);
                breadcrumbLinks.each((_, elem) => {
                    const categoryText = $(elem).text().trim();
                    if (categoryText && categoryText !== 'Shopee') {
                        categories.push(categoryText);
                    }
                });
            }

            // ========================================
            // VALIDATE & BUILD PRODUCT
            // ========================================

            if (!title) {
                return {
                    success: false,
                    error: `Missing required field: title`,
                };
            }

            const sourceId = this.extractIdFromUrl(url, /-i\.\d+\.(\d+)/) || url;

            const product: Product = {
                sourceId,
                title,
                sourceUrl: url,
                sourceName: this.config.siteName,
                domain: 'ecommerce',
                imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
                crawledAt: new Date().toISOString(),
            };

            // Add optional fields only if they have values
            if (description) {
                (product as any).description = description;
            }
            if (price) {
                (product as any).price = price;
            }
            if (originalPrice) {
                (product as any).originalPrice = originalPrice;
            }
            if (discount) {
                (product as any).discount = discount;
            }
            if (categories.length > 0) {
                (product as any).categories = categories;
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
