import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getUser } from '@/lib/auth';
import { toolDeclarations, executeToolCall } from '@/lib/ai/tools';

const SYSTEM_PROMPT = `You are FinBot, an intelligent AI financial assistant embedded in an expense tracking app. You help users manage their finances through natural language conversation.

Your capabilities:
1. **Add expenses**: When users mention spending money, extract amount, category, merchant, date, and payment method. Create the expense(s) using the add_expense tool.
2. **Query expenses**: When users ask about their spending, use get_expenses or get_category_summary to find and summarize the data.
3. **Update expenses**: When users want to change an expense, use update_expense. Use expense_id=-1 for the most recent expense.
4. **Delete expenses**: When users want to remove expenses, use delete_expense. For bulk deletes, first show what will be deleted (confirm_bulk=false), then delete on confirmation (confirm_bulk=true).
5. **Budget tracking**: Check budget status with get_budget_status when users ask about budgets.
6. **Insights**: Provide spending analysis and recommendations with get_insights.

Rules:
- Always extract as much information as possible from the user's message
- For categories, map to: Food, Groceries, Transport, Entertainment, Bills, Shopping, Healthcare, Education, Travel, Coffee, Restaurants, Utilities, Rent, Subscriptions, Personal, Other
- If the category isn't clear, make your best guess and mention it
- For dates, interpret naturally: "yesterday", "last week", "today", etc.
- Currency: default to dollars ($) unless specified otherwise
- Be concise but friendly in responses
- Use emojis sparingly for a friendly tone
- Format monetary amounts consistently: $XX.XX
- When showing lists, format them clearly
- If context allows, reference previous conversation for "that", "it", "the last one", etc.
- When user says "actually, make that..." or similar corrections, update the most recent relevant expense

Today's date is: ${new Date().toISOString().split('T')[0]}`;

// Models to try in order (fallback chain)
const MODELS_TO_TRY = [
  'gemini-3-flash-preview'
];

async function tryGenerateWithFallback(genAI, contents, preferredModel = null, maxRetries = 2) {
  let lastSeenError = 'No models tried';

  // Create a priority list: preferred model first, then the others
  const modelsToTry = preferredModel
    ? [preferredModel, ...MODELS_TO_TRY.filter(m => m !== preferredModel)]
    : MODELS_TO_TRY;

  for (const modelName of modelsToTry) {
    console.log(`[AI] Attempting ${modelName}...`);
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ functionDeclarations: toolDeclarations }],
        });
        const result = await model.generateContent({ contents });
        console.log(`[AI] Success with ${modelName}`);
        return { result, model, modelName };
      } catch (error) {
        lastSeenError = error.message || String(error);
        const errText = lastSeenError;
        const isQuotaError = errText.includes('429') || errText.includes('quota') || errText.includes('Too Many Requests');
        const isRetryable = errText.includes('503') || errText.includes('500');

        if (isQuotaError) {
          console.warn(`[AI] Quota exceeded for ${modelName} (429)`);
          break; // Try next model in list
        }

        if (isRetryable && attempt < maxRetries - 1) {
          console.log(`[AI] ${modelName} returned ${errText.includes('503') ? '503' : '500'}. Retrying (${attempt + 2}/${maxRetries})...`);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }

        console.error(`[AI] Failure for ${modelName}:`, error);
        break; // Try next model
      }
    }
  }
  return { error: 'All models failed', lastError: lastSeenError };
}

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, conversationHistory, lastExpenseIds } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return NextResponse.json({
        reply: "⚠️ The Gemini API key is not configured. Please add your API key to the `.env.local` file as `GEMINI_API_KEY=your_key_here`. You can get a free key at [aistudio.google.com](https://aistudio.google.com).",
        newExpenseIds: [],
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Build conversation history
    const contents = [];
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory.slice(-20)) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    // Try to generate with fallback models
    let genResult;
    let lastErrorMsg = '';

    try {
      genResult = await tryGenerateWithFallback(genAI, contents);
    } catch (e) {
      lastErrorMsg = e.message || String(e);
    }

    if (!genResult || genResult.error) {
      const errorDetail = lastErrorMsg || "All models returned 429 or other errors.";
      return NextResponse.json({
        reply: `⚠️ **API Error** — Your Gemini API key is currently unable to process this request.\n\n**Details:** ${errorDetail}\n\n**How to fix this:**\n1. Check if your API key in \`.env.local\` is correct.\n2. Verify your quota at [aistudio.google.com](https://aistudio.google.com).\n3. Try a different model or wait a few minutes.`,
        newExpenseIds: [],
      });
    }

    let { result, modelName } = genResult;
    let response = result.response;
    let allNewExpenseIds = lastExpenseIds ? [...lastExpenseIds] : [];

    // Handle function calls in a loop (chain of calls)
    let maxIterations = 5;
    while (maxIterations > 0) {
      const candidate = response.candidates?.[0];
      if (!candidate) break;

      const parts = candidate.content?.parts || [];
      const functionCalls = parts.filter(p => p.functionCall);

      if (functionCalls.length === 0) break;

      console.log(`[AI] Executing ${functionCalls.length} tool(s)...`);

      // Execute all function calls
      const functionResponses = [];
      for (const part of functionCalls) {
        const { name, args } = part.functionCall;
        console.log(`[AI] Tool Call: ${name}`, args);

        const toolResult = executeToolCall(name, args, user.id, allNewExpenseIds);

        if (toolResult.error) {
          console.error(`[AI] Tool Error: ${name}`, toolResult.error);
        } else if (toolResult.newExpenseIds) {
          allNewExpenseIds.push(...toolResult.newExpenseIds);
        }

        functionResponses.push({
          functionResponse: {
            name,
            response: toolResult,
          },
        });
      }

      // Add history
      contents.push(candidate.content);
      contents.push({ role: 'function', parts: functionResponses });

      // Robust next generation with fallback
      try {
        const nextResult = await tryGenerateWithFallback(genAI, contents, modelName);
        if (!nextResult || nextResult.error) {
          console.error('[AI] Generation failed in tool loop');
          break;
        }

        result = nextResult.result;
        response = result.response;
        modelName = nextResult.modelName;
      } catch (error) {
        console.error('[AI] Fatal error in tool loop:', error);
        break;
      }
      maxIterations--;
    }

    // Extract final response
    const candidate = response.candidates?.[0];
    const textParts = candidate?.content?.parts?.filter(p => p.text) || [];
    const thoughtParts = candidate?.content?.parts?.filter(p => p.thought) || [];

    let reply = textParts.map(p => p.text).join('\n').trim();

    if (!reply && thoughtParts.length > 0) {
      reply = thoughtParts.map(p => p.thought).join('\n').trim();
    }

    if (!reply) {
      reply = "I've analyzed your data, but I couldn't generate a specific response. Could you try asking in a different way?";
    }

    return NextResponse.json({ reply, newExpenseIds: allNewExpenseIds });
  } catch (error) {
    console.error('Chat error:', error);

    if (error.message?.includes('429') || error.message?.includes('quota')) {
      return NextResponse.json({
        reply: "⚠️ **API Quota Exceeded** — Please wait a minute and try again, or get a new API key at [aistudio.google.com](https://aistudio.google.com).",
        newExpenseIds: [],
      }, { status: 429 });
    }

    return NextResponse.json({
      reply: `Sorry, I encountered an error. Please try again in a moment.`,
      newExpenseIds: [],
    }, { status: 500 });
  }
}
