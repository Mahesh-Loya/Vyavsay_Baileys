import OpenAI from 'openai';
import { config } from '../config/environment.js';

const openai = new OpenAI({
  baseURL: 'https://models.inference.ai.azure.com',
  apiKey: config.GITHUB_PAT,
});

const MODEL = 'gpt-4o';

/** Structured analysis result from AI */
export interface AnalysisResult {
  intent: string;
  lead_score: string;
  confidence: number;
  tasks: { description: string; priority: string; due_date: string | null }[];
  appointment: { service: string | null; proposed_time_iso: string | null } | null;
  should_auto_reply: boolean;
  escalation_reason: string | null;
  language_detected: string;
  summary_update: string;
  // NEW: Entity extraction for inventory queries
  entities: {
    product_name: string | null;
    category: string | null;
    brand: string | null;
    price_min: number | null;
    price_max: number | null;
    attributes: Record<string, string>;
  } | null;
  query_type: 'structured' | 'semantic' | 'general';
}

/** Analyze a customer message — extract intent, lead score, tasks, entities */
export async function analyzeMessage(
  customerMessage: string,
  conversationHistory: string[],
  businessProfile: { business_name: string; industry: string; services: string[] }
): Promise<AnalysisResult> {
  const prompt = `You are an AI sales assistant analyzing a customer message for a business.

BUSINESS PROFILE:
- Name: ${businessProfile.business_name || 'My Business'}
- Industry: ${businessProfile.industry || 'General Services'}
- Services: ${businessProfile.services?.join(', ') || 'Various services'}

CONVERSATION HISTORY (recent messages):
${conversationHistory.length > 0 ? conversationHistory.slice(-10).join('\n') : 'No previous messages.'}

NEW CUSTOMER MESSAGE:
"${customerMessage}"

Analyze this message and return ONLY valid JSON:
{
  "intent": "<one of: greeting, pricing_inquiry, service_inquiry, meeting_request, portfolio_request, complaint, general_question, ready_to_buy, inventory_inquiry, inventory_browse, inventory_compare, price_negotiation>",
  "lead_score": "<one of: high, medium, low>",
  "confidence": <float 0-1>,
  "tasks": [{"description": "<task>", "priority": "<urgent|high|medium|low>", "due_date": null}],
  "appointment": {"service": "<string or null>", "proposed_time_iso": "<ISO string or null>"},
  "should_auto_reply": <true or false>,
  "escalation_reason": "<null or reason>",
  "language_detected": "<ISO code like en, hi, mr, es>",
  "summary_update": "<one line summary>",
  "entities": {
    "product_name": "<specific product/model name if mentioned, else null>",
    "category": "<product category if mentioned (sedan, SUV, hatchback, cake, haircut, etc.), else null>",
    "brand": "<brand name if mentioned, else null>",
    "price_min": <minimum price if mentioned, as number, else null>,
    "price_max": <maximum price if mentioned, as number, else null>,
    "attributes": {<key-value pairs for any specific attributes mentioned, e.g. "color": "white", "fuel_type": "diesel", "year": "2022">}
  },
  "query_type": "<structured if customer asks about specific product/filters, semantic if vague/subjective query, general if not product-related>"
}

INTENT RULES:
- "inventory_inquiry" = asking about a specific product ("Do you have Honda City?", "Is the red one available?")
- "inventory_browse" = browsing with filters ("Show me cars under 10 lakhs", "What SUVs do you have?")
- "inventory_compare" = comparing products ("Which is better, Creta or Seltos?")
- "price_negotiation" = haggling/bargaining ("Can you give discount?", "Last price?") — ESCALATE to human
- "pricing_inquiry" = asking price of a known item without negotiating
- "greeting" = simple hello/hi
- "complaint" = always escalate

ENTITY EXTRACTION RULES:
- Extract product names, brands, categories, colors, and any attributes mentioned
- Convert price mentions to numbers: "8 lakh" = 800000, "under 10L" = price_max: 1000000, "5-8 lakh range" = price_min: 500000, price_max: 800000
- For Indian prices: 1 lakh = 100000, 1 crore = 10000000
- If customer says "white automatic diesel SUV under 12 lakhs", extract ALL of those as entities
- Set entities to null if the message is not product-related (greetings, complaints, general questions)

SCORING RULES:
- "ready_to_buy", "pricing_inquiry", "inventory_inquiry" with specific product = HIGH
- "service_inquiry", "meeting_request", "inventory_browse" = MEDIUM
- "greeting", "general_question" = LOW
- "complaint" or "price_negotiation" = escalate, do NOT auto-reply

AUTO-REPLY RULES:
- Set true for: greeting, general_question, pricing_inquiry, service_inquiry, inventory_inquiry, inventory_browse
- Set false for: complaint, price_negotiation, or if human explicitly demanded

Return ONLY the JSON object.`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const text = response.choices[0].message.content || '{}';
    const result = JSON.parse(text);

    // Ensure entities structure exists
    if (!result.entities) {
      result.entities = null;
    }
    if (!result.query_type) {
      result.query_type = 'general';
    }

    return result;
  } catch (err: any) {
    console.error('❌ AI analysis failed:', err.message);
    return {
      intent: 'general_question',
      lead_score: 'low',
      confidence: 0.3,
      tasks: [],
      appointment: null,
      should_auto_reply: false,
      escalation_reason: 'AI analysis failed — needs human review',
      language_detected: 'en',
      summary_update: 'Unable to analyze message',
      entities: null,
      query_type: 'general',
    };
  }
}

/** Generate an auto-reply using business context + inventory/knowledge data */
export async function generateReply(
  customerMessage: string,
  conversationHistory: string[],
  knowledgeContext: string[],
  businessProfile: { business_name: string; industry: string; services: string[] },
  language: string,
  inventoryContext?: { items: any[]; soldItems?: any[]; alternatives?: any[] } | null
): Promise<string> {

  // Build inventory context string if we have product data
  let inventoryInfo = '';
  if (inventoryContext) {
    const { items, soldItems, alternatives } = inventoryContext;

    if (items && items.length > 0) {
      inventoryInfo += '\nAVAILABLE PRODUCTS FROM INVENTORY (REAL DATA — use this!):\n';
      items.forEach((item, i) => {
        const price = item.price ? (item.price >= 100000 ? `${(item.price / 100000).toFixed(1)}L` : `${item.price}`) : 'Price on request';
        const attrs = item.attributes ? Object.entries(item.attributes).map(([k, v]) => `${k}: ${v}`).join(', ') : '';
        inventoryInfo += `${i + 1}. ${item.item_name}${item.category ? ` (${item.category})` : ''} — ₹${price}, ${item.quantity} in stock${attrs ? `, ${attrs}` : ''}\n`;
      });
    }

    if (soldItems && soldItems.length > 0) {
      inventoryInfo += '\nSOLD OUT / UNAVAILABLE:\n';
      soldItems.forEach((item) => {
        inventoryInfo += `- ${item.item_name} — SOLD OUT\n`;
      });
    }

    if (alternatives && alternatives.length > 0) {
      inventoryInfo += '\nSIMILAR ALTERNATIVES AVAILABLE:\n';
      alternatives.forEach((item, i) => {
        const price = item.price ? (item.price >= 100000 ? `${(item.price / 100000).toFixed(1)}L` : `${item.price}`) : 'Price on request';
        inventoryInfo += `${i + 1}. ${item.item_name} — ₹${price}, ${item.quantity} in stock\n`;
      });
    }
  }

  const prompt = `You are a friendly salesperson texting a customer on WhatsApp for "${businessProfile.business_name || 'our business'}".

BUSINESS INFO:
- Industry: ${businessProfile.industry || 'Services'}
- Services: ${businessProfile.services?.join(', ') || 'Various'}

${inventoryInfo}

${knowledgeContext.length > 0 ? 'KNOWLEDGE BASE:\n' + knowledgeContext.join('\n---\n') : ''}

RULES:
1. Text like a REAL HUMAN — short sentences, casual tone, natural pauses with "..."
2. NEVER say "I'm an AI" or "As an assistant" or "I'd be happy to help"
3. Keep replies to 1-3 short sentences max. No walls of text.
4. If you have product data, mention count + starting price, then ask if they want details
5. Always end with a question or next step
6. Match the customer's vibe — casual if they're casual, polite if they're formal
7. Use natural expressions: "oh nice", "yeah we have that", "hmm let me check"
8. NO bullet points, NO numbered lists, NO markdown — pure text only
9. No sign-offs like "Best regards" or business name at the end
10. If something is SOLD OUT, say it naturally and immediately suggest alternatives
11. Reply in ${language === 'en' ? 'English' : "the customer's language (" + language + ")"} — if they mix Hindi+English, reply in Hinglish
12. For prices, use the format customers use: "5.5 lakh" not "550000"
13. NEVER make up products. ONLY mention items listed in AVAILABLE PRODUCTS above.
14. If no matching inventory found, say you'll check with the team.
15. DO NOT repeat questions the customer already answered`;

  const historicalMessages = conversationHistory.slice(0, -1);
  const mappedMessages: any[] = [{ role: 'system', content: prompt }];

  historicalMessages.slice(-10).forEach((msgString) => {
    if (msgString.startsWith('ai: ')) {
      mappedMessages.push({ role: 'assistant', content: msgString.replace('ai: ', '') });
    } else {
      mappedMessages.push({ role: 'user', content: msgString.replace(/^.*?: /, '') });
    }
  });

  mappedMessages.push({ role: 'user', content: customerMessage });

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: mappedMessages as any,
    });
    return response.choices[0].message.content || 'Thank you for your message. We will get back to you shortly.';
  } catch (err: any) {
    console.error('❌ AI reply generation failed:', err.message);
    return 'Thank you for your message. We will get back to you shortly.';
  }
}

/** Generate a conversation summary */
export async function generateSummary(messages: string[]): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{
        role: 'system',
        content: `Summarize this business conversation in 1-2 sentences. Focus on: what the customer wants, key decisions, pending actions.\n\nMessages:\n${messages.join('\n')}\n\nSummary:`,
      }],
    });
    return response.choices[0].message.content || 'Conversation in progress.';
  } catch {
    return 'Conversation in progress.';
  }
}

/** Generate a follow-up message for an inactive lead */
export async function generateFollowUp(
  customerName: string,
  stage: string,
  conversationHistory: string[],
  businessProfile: { business_name: string; industry: string; services: string[] }
): Promise<string> {
  const prompt = `You are a friendly salesperson texting a customer on WhatsApp for "${businessProfile.business_name || 'our business'}".
Your goal is to re-engage a customer named ${customerName} who has gone silent in the "${stage}" stage.

BUSINESS INFO:
- Industry: ${businessProfile.industry || 'Services'}
- Services: ${businessProfile.services?.join(', ') || 'Various'}

RECENT CONVERSATION:
${conversationHistory.length > 0 ? conversationHistory.slice(-5).join('\n') : 'No previous messages.'}

INSTRUCTIONS:
1. Write a highly personalized, friendly follow-up message (1-2 sentences max).
2. Reference what you were last talking about.
3. End with a soft, low-pressure question.
4. DO NOT use markdown. Keep it human-like texting style.
5. DO NOT sound robotic or like a bot.
6. Use natural expressions, keep it casual.`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: prompt }],
    });
    return response.choices[0].message.content || `Hi ${customerName}, just checking in on our previous conversation. Let me know if you still need any help!`;
  } catch (err: any) {
    console.error('❌ AI follow-up generation failed:', err.message);
    return `Hi ${customerName}, just checking in on our previous conversation. Let me know if you still need any help!`;
  }
}
