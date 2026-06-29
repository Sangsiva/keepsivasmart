import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { buildPromptPipeline } from '../src/services/ai/PromptPipelines';

// Load environment variables from .env
dotenv.config();

puppeteer.use(StealthPlugin());

const OUTPUT_DIR = path.join(process.cwd(), '.local-test-outputs');

async function testPureHeadlessGeneration(topic: string, filename: string) {
  console.log(`\\n--- Pure Headless Testing Topic: "${topic}" ---`);
  
  const pipeline = buildPromptPipeline(topic, 'AI & LLM Technical Architect', 15);
  const fullPrompt = `${pipeline.systemPrompt}\\n\\n${pipeline.userPrompt}`;

  // Check for required cookies in .env
  const cookie1PSID = process.env.GEMINI_COOKIE_1PSID;
  const cookie1PSIDTS = process.env.GEMINI_COOKIE_1PSIDTS;

  if (!cookie1PSID || !cookie1PSIDTS) {
    console.error('❌ Missing Google Session Cookies in .env file!');
    console.error('Please add GEMINI_COOKIE_1PSID and GEMINI_COOKIE_1PSIDTS to your .env');
    process.exit(1);
  }

  console.log('🚀 Launching invisible stealth browser...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Set the auth cookies to bypass login
  const cleanCookie = (val: string) => val.replace(/^"|"$/g, '').trim();
  
  await page.setCookie(
    { name: '__Secure-1PSID', value: cleanCookie(cookie1PSID), url: 'https://gemini.google.com' },
    { name: '__Secure-1PSIDTS', value: cleanCookie(cookie1PSIDTS), url: 'https://gemini.google.com' },
    ...(process.env.GEMINI_COOKIE_1PSIDCC ? [{ name: '__Secure-1PSIDCC', value: cleanCookie(process.env.GEMINI_COOKIE_1PSIDCC), url: 'https://gemini.google.com' }] : [])
  );

  try {
    console.log('🌍 Navigating to Gemini Web App (Authenticated)...');
    await page.goto('https://gemini.google.com/app', { waitUntil: 'networkidle2' });

    console.log('⌨️  Injecting prompt...');
    
    // Wait for the rich text editor
    const inputSelector = 'rich-textarea p, div[contenteditable="true"]';
    await page.waitForSelector(inputSelector, { timeout: 15000 });

    await page.evaluate((selector, text) => {
      const el = document.querySelector(selector) as HTMLElement;
      if (el) {
        el.innerText = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, inputSelector, fullPrompt);

    await new Promise(r => setTimeout(r, 1000));
    const sendButtonSelector = 'button[aria-label="Send message"], button.send-button';
    await page.click(sendButtonSelector).catch(async () => {
        await page.keyboard.press('Enter');
    });

    console.log('⏳ Waiting for Gemini AI to stream response...');
    
    let previousText = '';
    let unchangingCount = 0;
    let finalMarkdown = '';

    for (let i = 0; i < 60; i++) { // Max 2 minutes
      await new Promise(r => setTimeout(r, 2000));
      
      const currentText = await page.evaluate(() => {
        const responses = document.querySelectorAll('message-content, .model-response-text');
        if (responses.length > 0) {
           return (responses[responses.length - 1] as HTMLElement).innerText || '';
        }
        return '';
      });

      if (currentText && currentText === previousText) {
        unchangingCount++;
        if (unchangingCount >= 3) {
          finalMarkdown = currentText;
          break;
        }
      } else {
        unchangingCount = 0;
      }
      previousText = currentText;
    }

    if (!finalMarkdown) {
        console.error('❌ Failed to capture output or Gemini took too long.');
        return;
    }

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR);
    }
    
    const outputPath = path.join(OUTPUT_DIR, filename);

    if (!pipeline.useSearchGrounding) {
        let cleanText = finalMarkdown.trim();
        if (cleanText.startsWith('```json')) cleanText = cleanText.substring(7);
        else if (cleanText.startsWith('```')) cleanText = cleanText.substring(3);
        if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
        cleanText = cleanText.trim();
        
        try {
          const parsed = JSON.parse(cleanText);
          fs.writeFileSync(outputPath, parsed.markdownContent || finalMarkdown);
          console.log(`✅ Success! Saved to .local-test-outputs/${filename}`);
        } catch (e) {
          console.error(`❌ Failed to parse JSON. Raw output saved to .local-test-outputs/error_${filename}`);
          fs.writeFileSync(path.join(OUTPUT_DIR, `error_${filename}`), cleanText);
        }
    } else {
        fs.writeFileSync(outputPath, finalMarkdown);
        console.log(`✅ Success! Saved to .local-test-outputs/${filename}`);
    }

  } catch (error: any) {
    console.error('❌ Puppeteer Error:', error.message);
    
    // Take a screenshot to help debug if it fails (e.g. captcha or auth issue)
    await page.screenshot({ path: path.join(OUTPUT_DIR, `error_screenshot_${filename}.png`) });
    console.log(`📸 Error screenshot saved to error_screenshot_${filename}.png`);

  } finally {
    await browser.close();
  }
}

async function runTests() {
  console.log('🚀 Starting Pure Headless Chrome Testing via Puppeteer Stealth...');
  await testPureHeadlessGeneration('Latest GenAI advancements and news this week', 'headless_news.md');
  await testPureHeadlessGeneration('Deep dive into Mixture of Experts (MoE) LLM Architecture', 'headless_tech.md');
  await testPureHeadlessGeneration('Managerial soft skills for leading an AI engineering team', 'headless_softskills.md');
  console.log('\\n🎉 All tests completed. Check the .local-test-outputs directory for results.');
}

runTests();
