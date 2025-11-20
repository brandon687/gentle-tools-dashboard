import { fetchInventoryData } from './server/lib/googleSheets';

async function testRawInventory() {
  const testIMEI = '353006116499047';

  console.log('\n=== Testing Raw Inventory Fetch ===');
  console.log('Looking for IMEI:', testIMEI);

  try {
    console.log('\nFetching inventory data from Google Sheets...');
    const inventoryData = await fetchInventoryData();

    console.log('\n--- Inventory Data Summary ---');
    console.log('Physical inventory items:', inventoryData.physicalInventory?.length || 0);
    console.log('Raw inventory items:', inventoryData.rawInventory?.length || 0);

    if (inventoryData.rawInventory && inventoryData.rawInventory.length > 0) {
      console.log('\n--- Sample Raw Inventory Items (first 5) ---');
      inventoryData.rawInventory.slice(0, 5).forEach((item, idx) => {
        console.log(`${idx + 1}.`, {
          imei: item.imei,
          model: item.model,
          grade: item.grade,
          supplier: item.supplier,
        });
      });

      console.log('\n--- Searching for Test IMEI ---');
      const found = inventoryData.rawInventory.find(item =>
        item.imei && item.imei.trim() === testIMEI
      );

      if (found) {
        console.log('✅ FOUND in raw inventory:');
        console.log(JSON.stringify(found, null, 2));
      } else {
        console.log('❌ NOT FOUND in raw inventory');
        console.log('\nSearching with fuzzy match (contains)...');
        const fuzzyMatch = inventoryData.rawInventory.filter(item =>
          item.imei && item.imei.includes(testIMEI.slice(0, 10))
        );
        console.log(`Found ${fuzzyMatch.length} potential matches:`, fuzzyMatch.slice(0, 3));
      }

      // Check for all unique IMEIs
      const uniqueImeis = new Set(inventoryData.rawInventory.map(item => item.imei).filter(Boolean));
      console.log(`\nTotal unique IMEIs in raw inventory: ${uniqueImeis.size}`);
    } else {
      console.log('\n⚠️  No raw inventory data fetched!');
    }
  } catch (error) {
    console.error('\n❌ Error fetching inventory data:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

testRawInventory();
