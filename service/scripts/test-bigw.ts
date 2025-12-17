// ============================================================
// TEST-BIGW.TS - Test BigW crawler với BaseCollector
// Run: npx ts-node scripts/test-bigw.ts
// ============================================================

import { createCollector } from '../01_collection-service/crawlers';
import { PageTypes } from '../shared/types/core/crawl-data.type';
import { CrawlerConfig } from '../shared/types/core/crawler.type';
import * as fs from 'fs';

const TEST_URL = 'https://www.bigw.com.au/kids/boys-clothes/c/800101';

async function main() {    
    // ─────────────────────────────────────────────────────────────
    // Step 1: Configure crawler
    // ─────────────────────────────────────────────────────────────
    console.log('\n📋 Step 1: Configuring crawler...');
    
    const config: CrawlerConfig = {
        domain: 'ecommerce',
        startUrls: [
            {
                url: TEST_URL,
                pageType: PageTypes.LISTING,
            },
        ],
        maxRequestsPerCrawl: 10,
        maxConcurrency: 2,
        maxItemsPerListing: 5,  // Limit products to enqueue for testing
        requestHandlerTimeoutSecs: 60,
        navigationTimeoutSecs: 30,
    };
    
    console.log(`   ✅ Start URL: ${TEST_URL}`);
    console.log(`   ✅ Max requests: ${config.maxRequestsPerCrawl}`);
    console.log(`   ✅ Max items per listing: ${config.maxItemsPerListing}`);
    
    // ─────────────────────────────────────────────────────────────
    // Step 2: Create collector
    // ─────────────────────────────────────────────────────────────
    console.log('\n📋 Step 2: Creating collector...');
    
    const collector = createCollector('bigw', config);
    
    console.log('   ✅ Collector created for BigW');
    
    // ─────────────────────────────────────────────────────────────
    // Step 3: Run crawler
    // ─────────────────────────────────────────────────────────────
    console.log('\n📋 Step 3: Running crawler...');
    
    const startTime = Date.now();
    const results = await collector.run();
    const duration = Date.now() - startTime;
    
    // ─────────────────────────────────────────────────────────────
    // Step 4: Display results
    // ─────────────────────────────────────────────────────────────
    console.log('\n📋 Step 4: Results');
    console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`   Products extracted: ${results.length}`);
    
    // Show each product
    for (const product of results) {
        console.log('\n📦 Product:', {
            title: product.title,
            sourceId: product.sourceId,
            images: product.imageUrls?.length || 0,
            url: product.sourceUrl,
        });
    }
    
    // ─────────────────────────────────────────────────────────────
    // Step 5: Save results
    // ─────────────────────────────────────────────────────────────
    if (results.length > 0) {
        const outputPath = 'bigw-test-results.json';
        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
        console.log(`\n📄 Results saved to ${outputPath}`);
    }
    
    console.log('\n🎉 Test completed!');
}

main().catch(console.error);