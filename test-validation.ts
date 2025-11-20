import { validateIMEIs } from './server/lib/imeiValidation';

async function testValidation() {
  const testIMEI = '353006116499047';

  console.log('\n=== Testing IMEI Validation ===');
  console.log('Testing IMEI:', testIMEI);
  console.log('Expected: Found in Raw Inventory\n');

  try {
    const results = await validateIMEIs([testIMEI]);

    console.log('Validation Results:');
    console.log(JSON.stringify(results, null, 2));

    if (results.length > 0) {
      const result = results[0];
      console.log('\n--- Summary ---');
      console.log('Found:', result.found);
      console.log('Source:', result.source);
      console.log('Model:', result.model);
      console.log('Grade:', result.grade);
      console.log('Supplier:', result.supplier);
    }
  } catch (error) {
    console.error('Error during validation:', error);
  }
}

testValidation();
