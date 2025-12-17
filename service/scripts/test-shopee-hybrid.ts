import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Shopee Hybrid Scraper
 * Uses browser to bypass anti-bot, but intercepts API responses for fast data extraction
 * Best of both worlds: Browser authentication + API speed
 */

interface ShopeeAPIResponse {
    items?: Array<{
        item_basic: any;
    }>;
    item?: any;
    total_count?: number;
    nomore?: boolean;
}

async function testShopeeHybrid() {
    console.log('🚀 Starting Shopee Hybrid Scraper...\n');

    // Create output directory
    const outputDir = join(__dirname, '../.temp/shopee-hybrid-output');
    try {
        mkdirSync(outputDir, { recursive: true });
        console.log(`📁 Output directory: ${outputDir}\n`);
    } catch (err) {
        console.error('Failed to create output directory:', err);
    }

    const userDataDir = './.browser-profiles/shopee';
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false, // Set true for server
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    // Storage for intercepted data
    const searchResponses: any[] = [];
    const productDetails: any[] = [];

    // ========================================
    // INTERCEPT API RESPONSES
    // ========================================

    // Intercept search API
    page.on('response', async (response) => {
        const url = response.url();

        try {
            // Search API
            if (url.includes('/api/v4/search/search_items')) {
                console.log('🔍 Intercepted search API response');

                // Harvest Headers
                try {
                    const headers = await response.request().allHeaders();
                    const headersFile = join(outputDir, 'shopee-headers.json');
                    writeFileSync(headersFile, JSON.stringify(headers, null, 2));
                    console.log(`✅ Headers captured and saved to: ${headersFile}`);
                } catch (headerError) {
                    console.log('⚠️ Could not capture headers:', headerError);
                }

                const data: ShopeeAPIResponse = await response.json();

                if (data.items) {
                    console.log(`   Found ${data.items.length} items in API response`);
                    searchResponses.push({
                        url,
                        timestamp: new Date().toISOString(),
                        data,
                    });
                }
            }

            // Product detail API
            if (url.includes('/api/v4/item/get')) {
                console.log('📦 Intercepted product detail API response');
                const data: ShopeeAPIResponse = await response.json();

                if (data.item) {
                    console.log(`   Product: ${data.item.name}`);
                    productDetails.push({
                        url,
                        timestamp: new Date().toISOString(),
                        data,
                    });
                }
            }
        } catch (error) {
            // Not JSON or parsing error, ignore
        }
    });

    try {
        // ========================================
        // STEP 1: Search
        // ========================================
        const keyword = 'nồi chiên không dầu';
        const searchUrl = `https://shopee.vn/search?keyword=${encodeURIComponent(keyword)}&noCorrection=true`;

        console.log('='.repeat(60));
        console.log(`📄 Navigating to search page...`);
        console.log(`🔗 URL: ${searchUrl}`);
        console.log('='.repeat(60));

        await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });

        // Wait for search results to load
        await page.waitForSelector('li.shopee-search-item-result__item', { timeout: 10000 });

        console.log('\n⏳ Waiting for API responses...');
        await page.waitForTimeout(2000);

        // ========================================
        // STEP 2: Process search results
        // ========================================
        if (searchResponses.length > 0) {
            console.log('\n' + '='.repeat(60));
            console.log(`✅ Captured ${searchResponses.length} search API responses`);
            console.log('='.repeat(60));

            const latestSearch = searchResponses[searchResponses.length - 1];
            const items = latestSearch.data.items || [];

            console.log(`\n📊 Total items: ${latestSearch.data.total_count}`);
            console.log(`   Items in this page: ${items.length}`);
            console.log(`   No more pages: ${latestSearch.data.nomore}`);

            // Preview first 3 items
            console.log('\n📦 First 3 Items from API:');
            items.slice(0, 3).forEach((item: any, index: number) => {
                const basic = item.item_basic;
                console.log(`\n--- Item ${index + 1} ---`);
                console.log(`ID: ${basic.itemid}`);
                console.log(`Title: ${basic.name}`);
                console.log(`Price: ${formatPrice(basic.price)} đ`);
                console.log(`Sold: ${basic.historical_sold || basic.sold}`);
                console.log(`Rating: ${basic.item_rating?.rating_star || 0}`);
            });

            // ========================================
            // STEP 3: Click on first product to get detail
            // ========================================
            console.log('\n\n🔎 Navigating to product detail page...');

            try {
                const firstProduct = await page.locator('li.shopee-search-item-result__item').first();
                await firstProduct.click();

                // Wait for product detail page to load
                await page.waitForLoadState('networkidle', { timeout: 10000 });
                await page.waitForTimeout(2000);

                if (productDetails.length > 0) {
                    const detail = productDetails[productDetails.length - 1];
                    const item = detail.data.item;

                    console.log('\n✅ Product detail captured from API:');
                    console.log(`   Title: ${item.name}`);
                    console.log(`   Price: ${formatPrice(item.price)} đ`);
                    console.log(`   Description: ${item.description?.substring(0, 100)}...`);
                    console.log(`   Images: ${item.images?.length || 0}`);
                    console.log(`   Stock: ${item.stock}`);
                    console.log(`   Sold: ${item.historical_sold || item.sold}`);
                    console.log(`   Brand: ${item.brand || 'N/A'}`);
                }
            } catch (error) {
                console.log('⚠️  Could not navigate to product detail:', error);
            }
        } else {
            console.log('❌ No search API responses captured');
            console.log('   The page might not have loaded correctly');
        }

        // ========================================
        // STEP 4: Save intercepted data
        // ========================================
        console.log('\n' + '='.repeat(60));
        console.log('💾 Saving intercepted API data...');
        console.log('='.repeat(60));

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // Process and save search results
        const allItems: any[] = [];
        searchResponses.forEach(response => {
            response.data.items?.forEach((item: any) => {
                const basic = item.item_basic;
                allItems.push({
                    itemId: basic.itemid,
                    shopId: basic.shopid,
                    title: basic.name,
                    price: formatPrice(basic.price),
                    priceMin: formatPrice(basic.price_min),
                    priceMax: formatPrice(basic.price_max),
                    stock: basic.stock,
                    sold: basic.historical_sold || basic.sold,
                    rating: basic.item_rating?.rating_star || 0,
                    ratingCount: basic.item_rating?.rating_count?.reduce((a: number, b: number) => a + b, 0) || 0,
                    liked: basic.liked_count,
                    commentCount: basic.cmt_count,
                    location: basic.shop_location,
                    discount: basic.discount,
                    images: basic.images?.map((hash: string) => getImageUrl(hash)),
                    url: buildProductUrl(basic.itemid, basic.shopid, basic.name),
                });
            });
        });

        const itemsFile = join(outputDir, `items-${timestamp}.json`);
        writeFileSync(itemsFile, JSON.stringify(allItems, null, 2));
        console.log(`✅ Items (${allItems.length}): ${itemsFile}`);

        // Process and save product details
        const allDetails: any[] = [];
        productDetails.forEach(response => {
            const item = response.data.item;
            if (item) {
                allDetails.push({
                    itemId: item.itemid,
                    shopId: item.shopid,
                    title: item.name,
                    description: item.description,
                    price: formatPrice(item.price),
                    priceMin: formatPrice(item.price_min),
                    priceMax: formatPrice(item.price_max),
                    stock: item.stock,
                    sold: item.historical_sold || item.sold,
                    rating: item.item_rating?.rating_star || 0,
                    liked: item.liked_count,
                    commentCount: item.cmt_count,
                    location: item.shop_location,
                    brand: item.brand,
                    images: item.images?.map((hash: string) => getImageUrl(hash)),
                    url: buildProductUrl(item.itemid, item.shopid, item.name),
                });
            }
        });

        const detailsFile = join(outputDir, `details-${timestamp}.json`);
        writeFileSync(detailsFile, JSON.stringify(allDetails, null, 2));
        console.log(`✅ Details (${allDetails.length}): ${detailsFile}`);

        // Save raw API responses for debugging
        const rawFile = join(outputDir, `raw-api-${timestamp}.json`);
        writeFileSync(rawFile, JSON.stringify({
            searchResponses,
            productDetails,
        }, null, 2));
        console.log(`✅ Raw API data: ${rawFile}`);

        console.log('\n✅ Hybrid scraping completed!');
        console.log('📊 Summary:');
        console.log(`   - Items extracted: ${allItems.length}`);
        console.log(`   - Details extracted: ${allDetails.length}`);
        console.log(`   - API calls intercepted: ${searchResponses.length + productDetails.length}`);
        console.log('\n💡 This method bypasses 403 errors by using browser authentication!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        console.log('\n👋 Closing browser...');
        await context.close();
    }
}

// Helper functions
function formatPrice(price: number): number {
    return price / 100000;
}

function getImageUrl(imageHash: string): string {
    return `https://down-vn.img.susercontent.com/file/${imageHash}`;
}

function buildProductUrl(itemId: number, shopId: number, name: string): string {
    const slug = name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 100);

    return `https://shopee.vn/${slug}-i.${shopId}.${itemId}`;
}

// Run
testShopeeHybrid();
