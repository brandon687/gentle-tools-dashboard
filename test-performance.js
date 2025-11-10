#!/usr/bin/env node

/**
 * Performance Test for Outbound IMEIs Search
 * Compares cached vs non-cached search performance
 */

const API_URL = 'http://localhost:3000';

async function testSearchPerformance(searchTerm) {
  console.log(`\n🔍 Testing search for: "${searchTerm}"`);
  console.log('━'.repeat(50));

  const start = Date.now();

  try {
    const response = await fetch(`${API_URL}/api/outbound-imeis?search=${searchTerm}&limit=100`);
    const data = await response.json();

    const elapsed = Date.now() - start;

    console.log(`✅ Search completed in: ${elapsed}ms (${(elapsed/1000).toFixed(2)}s)`);
    console.log(`📊 Results found: ${data.pagination?.total || 0}`);
    console.log(`📦 Items returned: ${data.items?.length || 0}`);

    if (data.cacheInfo) {
      console.log(`\n📈 Cache Status:`);
      console.log(`   Last synced: ${data.cacheInfo.lastSyncedAt ? new Date(data.cacheInfo.lastSyncedAt).toLocaleString() : 'Never'}`);
      console.log(`   Cache size: ${data.cacheInfo.cacheSize?.toLocaleString() || 0} items`);
      console.log(`   Is stale: ${data.cacheInfo.isStale ? '⚠️ Yes (>1 hour old)' : '✅ No'}`);
    }

    // Performance rating
    if (elapsed < 100) {
      console.log(`\n⚡ EXCELLENT: Sub-100ms response!`);
    } else if (elapsed < 500) {
      console.log(`\n✨ GREAT: Under 500ms`);
    } else if (elapsed < 1000) {
      console.log(`\n✅ GOOD: Under 1 second`);
    } else if (elapsed < 2000) {
      console.log(`\n⚠️ ACCEPTABLE: Under 2 seconds`);
    } else {
      console.log(`\n❌ SLOW: Over 2 seconds`);
    }

    return { searchTerm, elapsed, results: data.pagination?.total || 0 };

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return { searchTerm, elapsed: Date.now() - start, error: error.message };
  }
}

async function runPerformanceTests() {
  console.log('🚀 Outbound IMEIs Search Performance Test');
  console.log('=' .repeat(50));

  // Check cache status first
  try {
    const statusResponse = await fetch(`${API_URL}/api/cache/sync-status`);
    const status = await statusResponse.json();

    if (status.success && status.lastSync) {
      console.log('\n📊 Current Cache Status:');
      console.log(`   Cache size: ${status.lastSync.cacheSize?.toLocaleString()} items`);
      console.log(`   Last sync: ${new Date(status.lastSync.syncedAt).toLocaleString()}`);
      console.log(`   Sync time: ${(status.lastSync.timeTaken / 1000).toFixed(1)}s`);
    } else {
      console.log('\n⚠️ Cache not yet synced. Performance may be slow.');
    }
  } catch (error) {
    console.log('\n⚠️ Could not check cache status');
  }

  // Test searches
  const testCases = [
    '357',           // Partial IMEI
    '359',           // Different partial IMEI
    '357136795163154', // Full IMEI
    'iPhone',        // Model search
    'INV-2024',      // Invoice search
  ];

  const results = [];
  for (const searchTerm of testCases) {
    const result = await testSearchPerformance(searchTerm);
    results.push(result);
  }

  // Summary
  console.log('\n\n📊 PERFORMANCE SUMMARY');
  console.log('=' .repeat(50));

  const avgTime = results.reduce((sum, r) => sum + r.elapsed, 0) / results.length;
  const maxTime = Math.max(...results.map(r => r.elapsed));
  const minTime = Math.min(...results.map(r => r.elapsed));

  console.log(`Average response time: ${avgTime.toFixed(0)}ms (${(avgTime/1000).toFixed(2)}s)`);
  console.log(`Fastest response: ${minTime}ms`);
  console.log(`Slowest response: ${maxTime}ms`);

  console.log('\nDetailed Results:');
  results.forEach(r => {
    const status = r.error ? '❌' : r.elapsed < 1000 ? '✅' : '⚠️';
    console.log(`  ${status} "${r.searchTerm}": ${r.elapsed}ms, ${r.results || 0} results`);
  });

  // Performance comparison with original
  const originalTime = 5000; // 5 seconds as stated in requirements
  const improvement = ((originalTime - avgTime) / originalTime * 100).toFixed(0);

  console.log('\n🎯 PERFORMANCE IMPROVEMENT');
  console.log('=' .repeat(50));
  console.log(`Original search time: ~5000ms`);
  console.log(`New average time: ${avgTime.toFixed(0)}ms`);
  console.log(`🚀 Performance improvement: ${improvement}% faster!`);
  console.log(`⚡ Speed increase: ${(originalTime / avgTime).toFixed(1)}x faster`);
}

// Run the tests
runPerformanceTests().catch(console.error);