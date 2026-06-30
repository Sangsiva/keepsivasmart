const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Navigate to Learning Hub
  await page.goto('http://localhost:3001/learning-hub');
  
  // Wait for the Listen button to appear
  await page.waitForSelector('button:has-text("Listen from Start")');
  
  const listenButton = await page.locator('button:has-text("Listen from Start")').first();
  await listenButton.click();
  
  console.log('Clicked Listen from Start. Waiting 10 seconds...');
  
  await page.waitForTimeout(10000);
  
  // Scroll down slightly
  await page.evaluate(() => window.scrollBy(0, 500));
  
  await page.waitForTimeout(2000);
  
  // Find the mermaid wrapper
  const mermaidCharts = await page.$$('.mermaid-wrapper');
  console.log(`Found ${mermaidCharts.length} mermaid charts.`);
  
  if (mermaidCharts.length > 0) {
    const boundingBox = await mermaidCharts[0].boundingBox();
    console.log('Chart bounding box:', boundingBox);
    
    // Check if SVG has content
    const svgContent = await mermaidCharts[0].innerHTML();
    console.log('SVG HTML length:', svgContent.length);
    if (svgContent.length < 50) {
      console.log('SVG Content is weirdly short:', svgContent);
    }
  } else {
    console.log('No mermaid charts found on the page! They disappeared!');
  }
  
  // Take a screenshot
  await page.screenshot({ path: '/Users/siva/.gemini/antigravity-ide/brain/94bfe4a8-decf-427e-8aad-87bcd2825875/scratch/test_screenshot.png' });
  
  // Refresh the page
  console.log('Refreshing page...');
  await page.goto('http://localhost:3001/learning-hub');
  await page.waitForTimeout(2000);
  
  const resumeButton = await page.locator('button:has-text("Resume from")').first();
  if (await resumeButton.isVisible()) {
    console.log('SUCCESS: Resume button is visible!', await resumeButton.textContent());
  } else {
    console.log('FAILED: Resume button is NOT visible after refresh.');
    // Check db directly
  }

  await browser.close();
})();
