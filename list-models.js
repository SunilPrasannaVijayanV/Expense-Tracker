import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/GEMINI_API_KEY=([^\r\n]+)/);
let apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;
if (apiKey && (apiKey.startsWith('"') || apiKey.startsWith("'"))) apiKey = apiKey.substring(1, apiKey.length - 1);

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    // Note: The SDK doesn't have a direct listModels, we use fetch
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

listModels();
