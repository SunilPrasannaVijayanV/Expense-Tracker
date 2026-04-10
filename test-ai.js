import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Load API Key
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/GEMINI_API_KEY=([^\r\n]+)/);
let apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

// Clean up potential quotes
if (apiKey && (apiKey.startsWith('"') || apiKey.startsWith("'"))) {
  apiKey = apiKey.substring(1, apiKey.length - 1);
}

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}

console.log('✅ Found API Key (starts with: ' + apiKey.substring(0, 8) + '...)');

// 2. Test Models
const genAI = new GoogleGenerativeAI(apiKey);
const MODELS = [
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-1.0-pro'
];

async function testModels() {
  console.log('\n--- AI Connectivity Test ---');
  
  for (const modelName of MODELS) {
    try {
      console.log(`\n[Testing] ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const start = Date.now();
      const result = await model.generateContent('Say "Bot is online" if you can read this.');
      const response = await result.response;
      const text = response.text();
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      
      console.log(`✅ ${modelName} is ONLINE! (Response in ${duration}s)`);
      console.log(`   Reply: "${text.trim()}"`);
    } catch (error) {
      const msg = error.message;
      if (msg.includes('429')) {
        console.warn(`⚠️ ${modelName} is at QUOTA (429)`);
      } else if (msg.includes('404')) {
        console.warn(`❌ ${modelName} NOT FOUND (404)`);
      } else if (msg.includes('API key not valid')) {
        console.error(`❌ API KEY INVALID`);
        break;
      } else {
        console.error(`❌ ${modelName} ERROR:`, msg);
      }
    }
  }
}

testModels();
