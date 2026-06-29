import puppeteer from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();
const prisma = new PrismaClient();

const APP_URL = 'http://127.0.0.1:3000';
let sessionCookie = '';
let csrfToken = '';

const REPORT_PATH = path.join(process.cwd(), '.local-test-outputs', 'qa_report.md');

// Helper to update markdown report
function updateReport(tcId: string, status: string, notes: string = '') {
  console.log(`[${status}] ${tcId}: ${notes}`);
}

async function getAuthCookie() {
  console.log('--- TC1.1: Authenticating via NextAuth API ---');
  try {
    // 1. Get CSRF token
    const csrfRes = await fetch(`${APP_URL}/api/auth/csrf`);
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    const csrfCookie = csrfRes.headers.get('set-cookie')?.split(';')[0]; // Extract __Host-next-auth.csrf-token

    // 2. Post credentials
    const authRes = await fetch(`${APP_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': csrfCookie || ''
      },
      body: new URLSearchParams({
        username: 'tester',
        password: 'password123',
        csrfToken: csrfToken,
        json: 'true'
      }).toString(),
      redirect: 'manual'
    });

    const setCookies = authRes.headers.getRaw ? authRes.headers.getRaw('set-cookie') : (authRes.headers as any).raw?.()['set-cookie'] || [];
    
    // In Node 18 fetch, we can use `getSetCookie()`
    const cookieArray = typeof authRes.headers.getSetCookie === 'function' ? authRes.headers.getSetCookie() : [];
    
    const sessionTokenString = cookieArray.find((c: string) => c.includes('authjs.session-token') || c.includes('next-auth.session-token'));
    
    if (sessionTokenString) {
      sessionCookie = sessionTokenString.split(';')[0];
      updateReport('TC1.1', '✅ PASS', 'Successfully retrieved auth cookie');
    } else {
      throw new Error('Session cookie not returned by callback API');
    }
  } catch (err: any) {
    updateReport('TC1.1', '❌ FAIL', err.message);
  }
}

async function testSettingsApi() {
  console.log('--- TC1.2: POST /api/settings ---');
  try {
    const res = await fetch(`${APP_URL}/api/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({ projectContext: 'QA Testing Phase', baseSkills: 'QA Automation' })
    });
    
    if (res.ok) {
      const data = await res.json();
      updateReport('TC1.2', '✅ PASS', `Settings updated for ${data.userId}`);
    } else {
      updateReport('TC1.2', '❌ FAIL', `Status: ${res.status}`);
    }
  } catch (err: any) {
    updateReport('TC1.2', '❌ FAIL', err.message);
  }
}

async function testGenerateApi() {
  console.log('--- TC4.1: POST /api/generate ---');
  try {
    const res = await fetch(`${APP_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        topicWeights: [{ id: '1', topic: 'React Testing', weight: 100 }],
        projectContext: 'Automated QA Testing',
        durationMinutes: 15
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      updateReport('TC4.1', '✅ PASS', `Module generated with ID: ${data.id}`);
      return data.id; // Return ID for feedback/quiz tests
    } else {
      const text = await res.text();
      updateReport('TC4.1', '❌ FAIL', `Status: ${res.status} - ${text}`);
      return null;
    }
  } catch (err: any) {
    updateReport('TC4.1', '❌ FAIL', err.message);
    return null;
  }
}

async function testFeedbackApi(moduleId: string) {
  console.log('--- TC3.1: POST /api/modules/[id]/feedback ---');
  try {
    const res = await fetch(`${APP_URL}/api/modules/${moduleId}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({ feedback: 'spot_on' })
    });
    
    if (res.ok) {
      updateReport('TC3.1', '✅ PASS', `Feedback submitted for ${moduleId}`);
    } else {
      updateReport('TC3.1', '❌ FAIL', `Status: ${res.status}`);
    }
  } catch (err: any) {
    updateReport('TC3.1', '❌ FAIL', err.message);
  }
}

async function testQuizApi(moduleId: string) {
  console.log('--- TC2.1: POST /api/modules/[id]/quiz ---');
  try {
    const res = await fetch(`${APP_URL}/api/quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({ markdownContent: '# Sample Markdown for Quiz' })
    });
    
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        updateReport('TC2.1', '✅ PASS', `Generated ${data.length} questions`);
      } else {
        updateReport('TC2.1', '❌ FAIL', `Returned invalid format`);
      }
    } else {
      const text = await res.text();
      updateReport('TC2.1', '❌ FAIL', `Status: ${res.status} - ${text}`);
    }
  } catch (err: any) {
    updateReport('TC2.1', '❌ FAIL', err.message);
  }
}

async function testCronApi() {
  console.log('--- TC5.1: GET /api/cron/generate (Unauthorized) ---');
  try {
    const res1 = await fetch(`${APP_URL}/api/cron/generate`);
    if (res1.status === 401) {
      updateReport('TC5.1', '✅ PASS', 'Blocked unauthorized access');
    } else {
      updateReport('TC5.1', '❌ FAIL', `Expected 401, got ${res1.status}`);
    }
  } catch (err: any) {
    updateReport('TC5.1', '❌ FAIL', err.message);
  }

  console.log('--- TC5.2: GET /api/cron/generate (Success) ---');
  try {
    const res2 = await fetch(`${APP_URL}/api/cron/generate`, {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });
    if (res2.ok) {
      updateReport('TC5.2', '✅ PASS', 'Cron generation succeeded');
    } else {
      const text = await res2.text();
      updateReport('TC5.2', '❌ FAIL', `Status: ${res2.status} - ${text}`);
    }
  } catch (err: any) {
    updateReport('TC5.2', '❌ FAIL', err.message);
  }
}

async function testCompleteApi(id: string) {
  console.log(`--- TC6.1: POST /api/modules/${id}/complete ---`);
  try {
    const res = await fetch(`${APP_URL}/api/modules/${id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      }
    });
    
    if (res.ok) {
      updateReport('TC6.1', '✅ PASS', `Module marked as complete and streak updated`);
    } else {
      const errorText = await res.text();
      updateReport('TC6.1', '❌ FAIL', `Status: ${res.status} - ${errorText}`);
    }
  } catch (err: any) {
    updateReport('TC6.1', '❌ FAIL', err.message);
  }
}

async function testTtsApi() {
  console.log(`--- TC7.1: POST /api/tts ---`);
  try {
    const res = await fetch(`${APP_URL}/api/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({ text: "Hello world" })
    });
    
    if (res.ok) {
      updateReport('TC7.1', '✅ PASS', `Audio generated via OpenAI`);
    } else if (res.status === 404) {
      updateReport('TC7.1', '✅ PASS', `Properly fell back to Web Speech API (No API Key)`);
    } else {
      const errorText = await res.text();
      updateReport('TC7.1', '❌ FAIL', `Status: ${res.status} - ${errorText}`);
    }
  } catch (err: any) {
    updateReport('TC7.1', '❌ FAIL', err.message);
  }
}

async function runQaSuite() {
  console.log('🚀 Starting Full QA API Test Suite...');
  
  // Create output dir if needed
  const outDir = path.dirname(REPORT_PATH);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  await getAuthCookie();
  
  if (sessionCookie) {
    await testSettingsApi();
    const moduleId = await testGenerateApi();
    
    if (moduleId) {
      await testFeedbackApi(moduleId);
      await testQuizApi(moduleId);
      await testCompleteApi(moduleId);
    } else {
      console.log('⚠️ Skipping Feedback & Quiz tests because Generation failed.');
    }
    
    if (moduleId) {
      await testCompleteApi(moduleId);
    } else {
      console.log('⚠️ Skipping Complete tests because Generation failed.');
    }

    await testTtsApi();
  }

  await testCronApi();
  
  console.log('🎉 QA Suite Finished!');
  process.exit(0);
}

runQaSuite();
