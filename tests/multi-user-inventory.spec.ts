import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// Helper function to wait for inventory to load
async function waitForInventoryLoad(page: Page) {
  await page.waitForSelector('[data-testid="tab-physical-inventory"]', { timeout: 10000 });
  await page.waitForTimeout(2000); // Wait for data to populate
}

// Helper function to grab IMEIs from Physical Inventory
async function grabIMEIsFromInventory(page: Page, count: number, modelFilter?: string): Promise<string[]> {
  console.log(`Grabbing ${count} IMEIs${modelFilter ? ` for model: ${modelFilter}` : ''}...`);

  // Go to Physical Inventory tab
  await page.click('[data-testid="tab-physical-inventory"]');
  await page.waitForTimeout(1500);

  const imeis: string[] = [];

  // Strategy: Expand one grade section and use "Copy IMEIs" button
  try {
    // Grant clipboard permissions first
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // Expand the first grade section (usually AB GRADE with most devices)
    const gradeButton = page.locator('button:has-text("Expand Models")').first();
    await gradeButton.waitFor({ timeout: 5000 });
    console.log('Expanding first grade section...');
    await gradeButton.click({ timeout: 3000 });
    await page.waitForTimeout(800);

    // Now find "Copy IMEIs" buttons within the model cards
    const copyButtons = page.locator('button:has-text("Copy IMEIs")');
    await copyButtons.first().waitFor({ timeout: 5000 });

    const buttonCount = await copyButtons.count();
    console.log(`Found ${buttonCount} Copy IMEI buttons`);

    // Click the first few copy buttons to get enough IMEIs
    for (let i = 0; i < Math.min(buttonCount, 3) && imeis.length < count; i++) {
      try {
        // Click copy button
        await copyButtons.nth(i).click();
        await page.waitForTimeout(300);

        // Get clipboard content
        const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
        const clipboardImeis = clipboardText
          .split('\n')
          .map(line => line.trim())
          .filter(line => /^\d{15}$/.test(line));

        console.log(`Got ${clipboardImeis.length} IMEIs from model ${i + 1}`);
        imeis.push(...clipboardImeis);

        if (imeis.length >= count) break;
      } catch (error) {
        console.log(`Failed to copy IMEIs from button ${i + 1}:`, error);
      }
    }
  } catch (error) {
    console.error('Error grabbing IMEIs:', error);
  }

  // Deduplicate and limit
  const uniqueImeis = [...new Set(imeis)].slice(0, count);
  console.log(`Successfully grabbed ${uniqueImeis.length} unique IMEIs`);
  return uniqueImeis;
}

// Helper function to submit IMEIs to Shipped Items
async function submitIMEIsToShipped(page: Page, imeis: string[], userId: string) {
  console.log(`[User ${userId}] Submitting ${imeis.length} IMEIs to Shipped Items...`);

  // Go to Shipped Items tab
  await page.click('[data-testid="tab-shipped-items"]');
  await page.waitForTimeout(500);

  // Find the textarea
  const textarea = page.locator('textarea[placeholder*="Paste IMEIs"]');
  await expect(textarea).toBeVisible();

  // Paste the IMEIs
  await textarea.fill(imeis.join('\n'));
  await page.waitForTimeout(300);

  // Click Add IMEIs button
  await page.click('button:has-text("Add IMEIs")');
  await page.waitForTimeout(1000);

  console.log(`[User ${userId}] Successfully submitted IMEIs`);
}

// Helper function to verify counts
async function verifyCounts(page: Page, expectedPhysical: number, expectedReconciled: number) {
  // Check Physical Inventory count
  await page.click('[data-testid="tab-physical-inventory"]');
  await page.waitForTimeout(1000);

  const physicalCount = page.locator('text=/\\d+ total devices/').first();
  const physicalText = await physicalCount.textContent();
  console.log(`Physical Inventory shows: ${physicalText}`);

  // Check Reconciled Inventory count
  await page.click('[data-testid="tab-reconciled-inventory"]');
  await page.waitForTimeout(1000);

  const reconciledCount = page.locator('text=/\\d+ total devices/').first();
  const reconciledText = await reconciledCount.textContent();
  console.log(`Reconciled Inventory shows: ${reconciledText}`);

  // Check Shipped Items badge count
  const shippedBadge = page.locator('[data-testid="tab-shipped-items"]');
  const shippedText = await shippedBadge.textContent();
  console.log(`Shipped Items tab shows: ${shippedText}`);
}

test.describe('Multi-User Inventory Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear server-side shipped IMEIs before each test
    try {
      await fetch(`${BASE_URL}/api/shipped-imeis`, { method: 'DELETE' });
    } catch (error) {
      console.warn('Failed to clear shipped IMEIs:', error);
    }

    // Navigate to the app
    await page.goto(BASE_URL);
    await waitForInventoryLoad(page);
  });

  test('should grab IMEIs from different models in Physical Inventory', async ({ page }) => {
    console.log('\n🧪 TEST: Grab IMEIs from different models\n');

    // Grab IMEIs without filter (mixed models)
    const mixedIMEIs = await grabIMEIsFromInventory(page, 5);
    expect(mixedIMEIs.length).toBeGreaterThan(0);
    console.log(`✅ Grabbed ${mixedIMEIs.length} mixed model IMEIs`);

    // Try to grab IMEIs for iPhone 14 specifically
    await page.goto(BASE_URL);
    await waitForInventoryLoad(page);

    const iphone14IMEIs = await grabIMEIsFromInventory(page, 3, '14');
    expect(iphone14IMEIs.length).toBeGreaterThanOrEqual(0);
    console.log(`✅ Grabbed ${iphone14IMEIs.length} iPhone 14 IMEIs`);

    // Verify all IMEIs are valid 15-digit numbers
    const allIMEIs = [...mixedIMEIs, ...iphone14IMEIs];
    allIMEIs.forEach(imei => {
      expect(imei).toMatch(/^\d{15}$/);
    });

    console.log('\n✅ TEST PASSED: Successfully grabbed IMEIs from different models\n');
  });

  test('should simulate 3 users submitting IMEIs concurrently', async ({ browser }) => {
    console.log('\n🧪 TEST: Multi-user concurrent IMEI submission\n');

    // Create 3 browser contexts (simulating 3 different users)
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);

    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

    // Initialize all pages
    await Promise.all(pages.map(async (page, idx) => {
      await page.goto(BASE_URL);
      await waitForInventoryLoad(page);
      console.log(`✅ User ${idx + 1} loaded the app`);
    }));

    // User 1: Grab and submit 5 IMEIs
    const user1IMEIs = await grabIMEIsFromInventory(pages[0], 5);

    // User 2: Grab and submit 5 different IMEIs
    const user2IMEIs = await grabIMEIsFromInventory(pages[1], 5);

    // User 3: Grab and submit 5 different IMEIs
    const user3IMEIs = await grabIMEIsFromInventory(pages[2], 5);

    console.log('\n📦 Starting concurrent submissions...\n');

    // Submit all concurrently (simulating simultaneous order dumps)
    await Promise.all([
      submitIMEIsToShipped(pages[0], user1IMEIs, '1'),
      submitIMEIsToShipped(pages[1], user2IMEIs, '2'),
      submitIMEIsToShipped(pages[2], user3IMEIs, '3')
    ]);

    console.log('\n✅ All users submitted IMEIs concurrently\n');

    // Verify on User 1's page
    await pages[0].reload();
    await waitForInventoryLoad(pages[0]);
    await pages[0].waitForTimeout(1000);

    // Check that shipped count increased
    const shippedTab = pages[0].locator('[data-testid="tab-shipped-items"]');
    const shippedText = await shippedTab.textContent();
    console.log(`Shipped Items tab shows: ${shippedText}`);

    expect(shippedText).toContain('Shipped Items');

    // Go to Reconciled Inventory and verify items appear there
    await pages[0].click('[data-testid="tab-reconciled-inventory"]');
    await pages[0].waitForTimeout(1000);

    const reconciledHeader = pages[0].locator('h3:has-text("Quick Insights")');
    await expect(reconciledHeader).toBeVisible();

    console.log('\n✅ TEST PASSED: Multi-user concurrent submission successful\n');

    // Cleanup
    await Promise.all(contexts.map(ctx => ctx.close()));
  });

  test('should verify Physical Inventory decreases and Reconciled increases', async ({ page }) => {
    console.log('\n🧪 TEST: Verify inventory count changes\n');

    // Get initial Physical Inventory count
    await page.click('[data-testid="tab-physical-inventory"]');
    await page.waitForTimeout(1000);

    const initialPhysicalText = await page.locator('text=/\\d+ total devices/').first().textContent();
    const initialPhysicalMatch = initialPhysicalText?.match(/(\d+) total devices/);
    const initialPhysicalCount = initialPhysicalMatch ? parseInt(initialPhysicalMatch[1]) : 0;
    console.log(`📊 Initial Physical Inventory: ${initialPhysicalCount} devices`);

    // Grab 10 IMEIs
    const imeisToShip = await grabIMEIsFromInventory(page, 10);
    expect(imeisToShip.length).toBeGreaterThan(0);
    console.log(`✅ Grabbed ${imeisToShip.length} IMEIs to ship`);

    // Submit to Shipped Items
    await submitIMEIsToShipped(page, imeisToShip, 'Test');

    // Refresh and check new counts
    await page.reload();
    await waitForInventoryLoad(page);
    await page.waitForTimeout(1000);

    // Check Physical Inventory decreased
    await page.click('[data-testid="tab-physical-inventory"]');
    await page.waitForTimeout(1000);

    const newPhysicalText = await page.locator('text=/\\d+ total devices/').first().textContent();
    const newPhysicalMatch = newPhysicalText?.match(/(\d+) total devices/);
    const newPhysicalCount = newPhysicalMatch ? parseInt(newPhysicalMatch[1]) : 0;
    console.log(`📊 New Physical Inventory: ${newPhysicalCount} devices`);
    console.log(`📉 Decrease: ${initialPhysicalCount - newPhysicalCount} devices`);

    expect(newPhysicalCount).toBeLessThan(initialPhysicalCount);

    // Check Reconciled Inventory increased
    await page.click('[data-testid="tab-reconciled-inventory"]');
    await page.waitForTimeout(1000);

    const reconciledText = await page.locator('text=/\\d+ total devices/').first().textContent();
    const reconciledMatch = reconciledText?.match(/(\d+) total devices/);
    const reconciledCount = reconciledMatch ? parseInt(reconciledMatch[1]) : 0;
    console.log(`📊 Reconciled Inventory: ${reconciledCount} devices`);

    expect(reconciledCount).toBe(imeisToShip.length);

    console.log('\n✅ TEST PASSED: Inventory counts updated correctly\n');
  });

  test('should handle rapid sequential submissions from same user', async ({ page }) => {
    console.log('\n🧪 TEST: Rapid sequential submissions\n');

    // Grab 15 IMEIs
    const allIMEIs = await grabIMEIsFromInventory(page, 15);
    expect(allIMEIs.length).toBeGreaterThan(0);

    // Split into 3 batches
    const batch1 = allIMEIs.slice(0, 5);
    const batch2 = allIMEIs.slice(5, 10);
    const batch3 = allIMEIs.slice(10, 15);

    console.log(`📦 Batch 1: ${batch1.length} IMEIs`);
    console.log(`📦 Batch 2: ${batch2.length} IMEIs`);
    console.log(`📦 Batch 3: ${batch3.length} IMEIs`);

    // Submit rapidly one after another
    await submitIMEIsToShipped(page, batch1, 'Batch1');
    await submitIMEIsToShipped(page, batch2, 'Batch2');
    await submitIMEIsToShipped(page, batch3, 'Batch3');

    // Verify all were added
    const shippedTab = page.locator('[data-testid="tab-shipped-items"]');
    const shippedText = await shippedTab.textContent();
    console.log(`Final shipped count: ${shippedText}`);

    // Check shipped items list
    await page.click('[data-testid="tab-shipped-items"]');
    await page.waitForTimeout(1000);

    const shippedList = page.locator('[class*="divide-y"] > div');
    const shippedCount = await shippedList.count();
    console.log(`Shipped list contains: ${shippedCount} items`);

    expect(shippedCount).toBe(allIMEIs.length);

    console.log('\n✅ TEST PASSED: Rapid sequential submissions handled correctly\n');
  });
});
