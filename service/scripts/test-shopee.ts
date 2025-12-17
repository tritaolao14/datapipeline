import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ShopeeStrategy } from '../01_collection-service/crawlers/domains/e-commerces/shopee/shopee.strategy';
import { PageContext } from '../shared/types/core/page-context.type';
import { PageTypes } from '../shared/types/core/crawl-data.type';
import { ProductListingItem } from '../shared/types/domains/e-commerce/product.type';

async function testShopee() {
    console.log('Starting Shopee Test...');

    // Create output directory for JSON files
    const outputDir = join(__dirname, '../.temp/shopee-test-output');
    try {
        mkdirSync(outputDir, { recursive: true });
        console.log(`📁 Output directory: ${outputDir}`);
    } catch (err) {
        console.error('Failed to create output directory:', err);
    }

    const userDataDir = './.browser-profiles/shopee';
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        bypassCSP: true,
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true,
        extraHTTPHeaders: {
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-User': '?1',
            'Sec-Fetch-Dest': 'document',
            'Upgrade-Insecure-Requests': '1'
        },
        args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--allow-running-insecure-content',
            '--disable-setuid-sandbox',
            '--no-sandbox'
        ]
    });

    // Get existing page or create new one
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    // Start from page 0
    const baseUrl = 'https://shopee.vn/search';
    const params = new URLSearchParams({
        facet: '11111626',
        is_from_login: 'true',
        keyword: 'nồi chiên không dầu',
        noCorrection: 'true',
        page: '0',
    });

    const url = `${baseUrl}?${params.toString()}`;

    try {
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Add stealth scripts
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN', 'vi', 'en-US', 'en'] });
            (window as any).chrome = { runtime: {} };
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters: any) =>
                parameters.name === 'notifications'
                    ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
                    : originalQuery(parameters);
        });

        await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
            console.log('Network not fully idle, continuing anyway...');
        });

        await page.waitForTimeout(3000);

        console.log('--------------------------------------------------');
        console.log('⚠️  MANUAL ACTION (if needed): Login and press ENTER');
        console.log('--------------------------------------------------');

        await new Promise<void>(resolve => {
            process.stdin.once('data', () => resolve());
        });

        const strategy = new ShopeeStrategy();

        // Storage for all extracted data
        const allListingItems: ProductListingItem[] = [];
        const allDetailData: any[] = [];

        let currentUrl = url;
        let pageNum = 0;
        const maxPages = 2; // Test 2 pages
        const maxDetailsPerPage = 2; // Extract detail for 2 products/page

        while (pageNum < maxPages) {
            console.log('\n' + '='.repeat(60));
            console.log(`📄 Testing Page ${pageNum}: ${currentUrl}`);
            console.log('='.repeat(60));

            const pageContext: PageContext = {
                url: currentUrl,
                domain: 'shopee.vn',
                pageType: PageTypes.LISTING,
                confidence: 1,
                detectedBy: 'url_pattern'
            };

            // Extract listing items
            console.log('\n🔍 Extracting listing items...');
            const result = await strategy.extractListingItems(page, pageContext);

            if (result.success) {
                console.log(`✅ Found ${result.listingItems.length} items`);
                allListingItems.push(...result.listingItems);

                if (result.listingItems.length > 0) {
                    console.log('\n📦 First 3 Items:');
                    result.listingItems.slice(0, 3).forEach((item, i) => {
                        console.log(`\n--- Item ${i + 1} ---`);
                        console.log(JSON.stringify(item, null, 2));
                    });

                    // Extract details for first few products
                    console.log(`\n\n🔎 Extracting details for ${maxDetailsPerPage} products...`);

                    for (let i = 0; i < Math.min(maxDetailsPerPage, result.listingItems.length); i++) {
                        const item = result.listingItems[i];
                        console.log(`\n--- Detail ${i + 1}/${maxDetailsPerPage} ---`);
                        console.log(`📍 ${item.itemUrl}`);

                        try {
                            await page.goto(item.itemUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

                            // CRITICAL: Wait for content to be rendered by JavaScript
                            // Shopee is CSR (Client Side Rendered), need to wait for specific elements
                            console.log('   ⏳ Waiting for content to load...');

                            try {
                                // Wait for product title to appear (multiple selectors)
                                await page.waitForSelector('span.zmdJz8, h1', { timeout: 10000 });

                                // Wait for images to load (try multiple selectors)
                                await page.waitForSelector('img.uXN1L5, img[elementtiming="shopee:heroComponentPaint"]', {
                                    timeout: 10000
                                }).catch(() => {
                                    console.log('   ⚠️  Images not found with primary selectors');
                                });

                                // Additional wait for lazy-loaded content
                                await page.waitForTimeout(2000);

                                console.log('   ✓ Content loaded');
                            } catch (waitError) {
                                console.log('   ⚠️  Timeout waiting for content, proceeding anyway...');
                            }

                            // Now extract with Cheerio
                            const $ = await strategy.getCheerio(page);
                            const detailContext: PageContext = {
                                url: item.itemUrl,
                                domain: 'shopee.vn',
                                pageType: PageTypes.PRODUCT,
                                confidence: 1,
                                detectedBy: 'url_pattern'
                            };

                            const detailResult = await strategy.extractDetailData($, item.itemUrl, detailContext);

                            if (detailResult.success && detailResult.data) {
                                console.log('✅ Detail extracted');
                                console.log(`   Title: ${detailResult.data.title}`);
                                console.log(`   Images: ${detailResult.data.imageUrls?.length || 0}`);

                                // Also log if we got price, description, etc
                                const data = detailResult.data as any;
                                if (data.price) console.log(`   Price: ${data.price}`);
                                if (data.description) console.log(`   Description: ${data.description.substring(0, 50)}...`);
                                if (data.categories) console.log(`   Categories: ${data.categories.join(' > ')}`);

                                allDetailData.push({
                                    ...detailResult.data,
                                    listingMetadata: item,
                                });
                            } else {
                                console.log('❌ Failed:', detailResult.error);

                                // DEBUG: Save HTML for inspection when extraction fails
                                const htmlContent = await page.content();
                                const debugFile = join(outputDir, `debug-html-${i}.html`);
                                writeFileSync(debugFile, htmlContent);
                                console.log(`   📄 HTML saved to: ${debugFile}`);
                            }

                            await page.waitForTimeout(1000);
                        } catch (error) {
                            console.error(`❌ Error: ${error}`);
                        }
                    }

                    console.log('\n↩️  Back to listing...');
                    await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    await page.waitForTimeout(1000);
                }
            } else {
                console.error('❌ FAILED:', result.error);
                break;
            }

            // Check pagination
            console.log('\n🔄 Checking pagination...');
            const paginationInfo = await strategy.getPaginationInfo(page, pageContext);

            if (paginationInfo.hasNextPage && paginationInfo.nextPageUrl) {
                console.log(`✅ Next page: ${paginationInfo.nextPageUrl}`);
                currentUrl = paginationInfo.nextPageUrl;
                await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await page.waitForTimeout(2000);
                pageNum++;
            } else {
                console.log('❌ No more pages');
                break;
            }
        }

        // Save results
        console.log('\n' + '='.repeat(60));
        console.log('💾 Saving results...');
        console.log('='.repeat(60));

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        const listingFile = join(outputDir, `listing-${timestamp}.json`);
        writeFileSync(listingFile, JSON.stringify(allListingItems, null, 2));
        console.log(`✅ Listing (${allListingItems.length}): ${listingFile}`);

        const detailFile = join(outputDir, `detail-${timestamp}.json`);
        writeFileSync(detailFile, JSON.stringify(allDetailData, null, 2));
        console.log(`✅ Details (${allDetailData.length}): ${detailFile}`);

        const summary = {
            timestamp,
            stats: {
                totalListingItems: allListingItems.length,
                totalDetailExtracted: allDetailData.length,
                pagesScraped: pageNum + 1,
            },
            sampleListing: allListingItems.slice(0, 3),
            sampleDetail: allDetailData.slice(0, 2),
        };

        const summaryFile = join(outputDir, `summary-${timestamp}.json`);
        writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
        console.log(`✅ Summary: ${summaryFile}`);

        console.log('\n✅ Test completed!');
        console.log(`📊 Listing: ${allListingItems.length}, Details: ${allDetailData.length}, Pages: ${pageNum + 1}`);

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        console.log('\n👋 Closing browser...');
        await context.close();
    }
}

testShopee();
