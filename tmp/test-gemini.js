import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key Found:', apiKey ? 'Yes (' + apiKey.substring(0, 10) + '...)' : 'No');

if (!apiKey) {
  console.error('No API Key found in .env.local');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function test() {
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
  
  for (const modelName of models) {
    console.log(`Testing model: ${modelName}...`);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Hello, are you working?");
      const response = await result.response;
      console.log(`SUCCESS with ${modelName}:`, response.text().substring(0, 50) + "...");
      return; // Stop after first success
    } catch (error) {
      console.error(`FAILED with ${modelName}:`, error.message);
    }
  }
  console.log('All models failed.');
}

test();
