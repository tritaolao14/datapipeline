import axios from 'axios';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Shopee API Scraper
 * Scrapes data directly from Shopee's internal APIs instead of using browser
 * Much faster and less likely to be blocked
 */

interface ShopeeSearchParams {
    by: string;           // relevancy, sales, price
    keyword: string;      // search keyword
    limit: number;        // items per page (max 60)
    match_id?: string;    // category id
    newest?: number;      // offset for pagination
    order: string;        // desc, asc
    page_type: string;    // search
    scenario: string;     // PAGE_GLOBAL_SEARCH
    version: number;      // 2
}

interface ShopeeItem {
    itemid: number;
    shopid: number;
    name: string;
    price: number;
    price_max: number;
    price_min: number;
    stock: number;
    sold: number;
    historical_sold: number;
    liked_count: number;
    cmt_count: number;
    item_rating: {
        rating_star: number;
        rating_count: number[];
    };
    images: string[];
    shop_location?: string;
    discount?: string;
}

interface ShopeeSearchResponse {
    items: Array<{
        item_basic: ShopeeItem;
    }>;
    total_count: number;
    nomore: boolean;
}

interface ShopeeProductDetail {
    item: {
        itemid: number;
        shopid: number;
        name: string;
        description: string;
        price: number;
        price_max: number;
        price_min: number;
        stock: number;
        sold: number;
        historical_sold: number;
        liked_count: number;
        cmt_count: number;
        images: string[];
        item_rating: {
            rating_star: number;
            rating_count: number[];
        };
        shop_location?: string;
        brand?: string;
        categories?: Array<{ catid: number; display_name: string }>;
    };
}

/**
 * Create Shopee API client with proper headers
 */
class ShopeeAPIClient {
    private baseUrl = 'https://shopee.vn';
    private apiVersion = 'v4';
    private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    private cookies: string = '';

    /**
     * Set cookies from browser session
     * You can get these from browser DevTools -> Application -> Cookies
     */
    setCookies(cookies: string) {
        this.cookies = cookies;
    }

    private getHeaders(referer?: string) {
        const headers: any = {
            'User-Agent': this.userAgent,
            'Referer': referer || `${this.baseUrl}/search`,
            'Accept': 'application/json',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'X-Requested-With': 'XMLHttpRequest',
            'X-API-Source': 'pc',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
        };

        if (this.cookies) {
            headers['Cookie'] = this.cookies;
        }
        const save_header = JSON.stringify(headers);
        writeFileSync('./header.json', save_header);
        return headers;
    }

    /**
     * Search for products
     */
    async search(keyword: string, page: number = 0, limit: number = 60): Promise<ShopeeSearchResponse> {
        const params: ShopeeSearchParams = {
            by: 'relevancy',
            keyword: keyword,
            limit: limit,
            newest: page * limit, // offset
            order: 'desc',
            page_type: 'search',
            scenario: 'PAGE_GLOBAL_SEARCH',
            version: 2,
        };

        const url = `${this.baseUrl}/api/${this.apiVersion}/search/search_items`;

        try {
            const response = await axios.get<ShopeeSearchResponse>(url, {
                params,
                headers: this.getHeaders(),
            });

            return response.data;
        } catch (error) {
            console.error('Search API error:', error);
            throw error;
        }
    }

    /**
     * Get product detail
     */
    async getProductDetail(itemId: number, shopId: number): Promise<ShopeeProductDetail> {
        const url = `${this.baseUrl}/api/${this.apiVersion}/item/get`;

        try {
            const response = await axios.get<ShopeeProductDetail>(url, {
                params: {
                    itemid: itemId,
                    shopid: shopId,
                },
                headers: this.getHeaders(),
            });

            return response.data;
        } catch (error) {
            console.error('Product detail API error:', error);
            throw error;
        }
    }

    /**
     * Build product URL from IDs
     */
    buildProductUrl(itemId: number, shopId: number, name: string): string {
        // Shopee URL format: /product-name-i.shopId.itemId
        const slug = name.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 100);

        return `${this.baseUrl}/${slug}-i.${shopId}.${itemId}`;
    }

    /**
     * Convert Shopee image hash to full URL
     */
    getImageUrl(imageHash: string, size: 'thumbnail' | 'small' | 'medium' | 'large' = 'large'): string {
        const sizeMap = {
            thumbnail: '_tn',
            small: '',
            medium: '@resize_w450_nl',
            large: '@resize_w900_nl',
        };

        return `https://down-vn.img.susercontent.com/file/${imageHash}${sizeMap[size]}`;
    }

    /**
     * Format price (Shopee prices are in smallest currency unit, divide by 100000)
     */
    formatPrice(price: number): number {
        return price / 100000;
    }
}

/**
 * Main test function
 */
async function testShopeeAPI() {
    console.log('🚀 Starting Shopee API Test...\n');

    // Create output directory
    const outputDir = join(__dirname, '../.temp/shopee-api-output');
    try {
        mkdirSync(outputDir, { recursive: true });
        console.log(`📁 Output directory: ${outputDir}\n`);
    } catch (err) {
        console.error('Failed to create output directory:', err);
    }

    const client = new ShopeeAPIClient();

    // Test parameters
    const keyword = 'nồi chiên không dầu';
    const maxPages = 2;
    const maxDetailsPerPage = 2;

    const allItems: any[] = [];
    const allDetails: any[] = [];

    try {
        // ========================================
        // STEP 1: Search for products
        // ========================================
        for (let page = 0; page < maxPages; page++) {
            console.log('='.repeat(60));
            console.log(`📄 Page ${page}: Searching for "${keyword}"...`);
            console.log('='.repeat(60));

            const searchResult = await client.search(keyword, page);

            console.log(`✅ Found ${searchResult.items.length} items (Total: ${searchResult.total_count})`);
            console.log(`   No more pages: ${searchResult.nomore}`);

            // Process items
            searchResult.items.forEach((item, index) => {
                const basic = item.item_basic;

                const processedItem = {
                    itemId: basic.itemid,
                    shopId: basic.shopid,
                    title: basic.name,
                    price: client.formatPrice(basic.price),
                    priceMin: client.formatPrice(basic.price_min),
                    priceMax: client.formatPrice(basic.price_max),
                    stock: basic.stock,
                    sold: basic.historical_sold,
                    rating: basic.item_rating?.rating_star || 0,
                    ratingCount: basic.item_rating?.rating_count?.reduce((a, b) => a + b, 0) || 0,
                    liked: basic.liked_count,
                    commentCount: basic.cmt_count,
                    location: basic.shop_location,
                    discount: basic.discount,
                    thumbnail: basic.images?.[0] ? client.getImageUrl(basic.images[0], 'thumbnail') : undefined,
                    url: client.buildProductUrl(basic.itemid, basic.shopid, basic.name),
                };

                allItems.push(processedItem);

                // Preview first 3
                if (index < 3) {
                    console.log(`\n--- Item ${index + 1} ---`);
                    console.log(`Title: ${processedItem.title}`);
                    console.log(`Price: ${processedItem.price.toLocaleString('vi-VN')} đ`);
                    console.log(`Sold: ${processedItem.sold}`);
                    console.log(`Rating: ${processedItem.rating} (${processedItem.ratingCount} reviews)`);
                }
            });

            // ========================================
            // STEP 2: Get product details
            // ========================================
            console.log(`\n\n🔎 Fetching details for ${maxDetailsPerPage} products...`);

            for (let i = 0; i < Math.min(maxDetailsPerPage, searchResult.items.length); i++) {
                const basic = searchResult.items[i].item_basic;

                console.log(`\n--- Detail ${i + 1}/${maxDetailsPerPage} ---`);
                console.log(`📍 Item ID: ${basic.itemid}, Shop ID: ${basic.shopid}`);

                try {
                    const detail = await client.getProductDetail(basic.itemid, basic.shopid);

                    const processedDetail = {
                        itemId: detail.item.itemid,
                        shopId: detail.item.shopid,
                        title: detail.item.name,
                        description: detail.item.description,
                        price: client.formatPrice(detail.item.price),
                        priceMin: client.formatPrice(detail.item.price_min),
                        priceMax: client.formatPrice(detail.item.price_max),
                        stock: detail.item.stock,
                        sold: detail.item.historical_sold,
                        rating: detail.item.item_rating?.rating_star || 0,
                        ratingCount: detail.item.item_rating?.rating_count?.reduce((a, b) => a + b, 0) || 0,
                        liked: detail.item.liked_count,
                        commentCount: detail.item.cmt_count,
                        location: detail.item.shop_location,
                        brand: detail.item.brand,
                        categories: detail.item.categories?.map(c => c.display_name),
                        images: detail.item.images?.map(hash => client.getImageUrl(hash, 'large')),
                        url: client.buildProductUrl(detail.item.itemid, detail.item.shopid, detail.item.name),
                    };

                    console.log(`✅ Detail extracted`);
                    console.log(`   Title: ${processedDetail.title}`);
                    console.log(`   Images: ${processedDetail.images?.length || 0}`);
                    console.log(`   Description: ${processedDetail.description?.substring(0, 50)}...`);
                    console.log(`   Categories: ${processedDetail.categories?.join(' > ')}`);

                    allDetails.push(processedDetail);

                    // Rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (error) {
                    console.error(`❌ Error fetching detail:`, error);
                }
            }

            // Rate limiting between pages
            if (page < maxPages - 1) {
                console.log('\n⏳ Waiting before next page...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // ========================================
        // STEP 3: Save results
        // ========================================
        console.log('\n' + '='.repeat(60));
        console.log('💾 Saving results...');
        console.log('='.repeat(60));

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // Save items
        const itemsFile = join(outputDir, `items-${timestamp}.json`);
        writeFileSync(itemsFile, JSON.stringify(allItems, null, 2));
        console.log(`✅ Items (${allItems.length}): ${itemsFile}`);

        // Save details
        const detailsFile = join(outputDir, `details-${timestamp}.json`);
        writeFileSync(detailsFile, JSON.stringify(allDetails, null, 2));
        console.log(`✅ Details (${allDetails.length}): ${detailsFile}`);

        // Save summary
        const summary = {
            timestamp,
            method: 'API',
            stats: {
                totalItems: allItems.length,
                totalDetails: allDetails.length,
                pagesScraped: maxPages,
            },
            sampleItems: allItems.slice(0, 3),
            sampleDetails: allDetails.slice(0, 2),
        };

        const summaryFile = join(outputDir, `summary-${timestamp}.json`);
        writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
        console.log(`✅ Summary: ${summaryFile}`);

        console.log('\n✅ API Test completed!');
        console.log(`📊 Items: ${allItems.length}, Details: ${allDetails.length}, Pages: ${maxPages}`);
        console.log('\n💡 API scraping is much faster than browser scraping!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run if executed directly
if (require.main === module) {
    testShopeeAPI();
}

export { ShopeeAPIClient, testShopeeAPI };
