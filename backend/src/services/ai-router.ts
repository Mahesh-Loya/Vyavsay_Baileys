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
}

/** Analyze a customer message — extract intent, lead score, tasks */
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
  "intent": "<one of: greeting, pricing_inquiry, service_inquiry, meeting_request, portfolio_request, complaint, general_question, ready_to_buy>",
  "lead_score": "<one of: high, medium, low>",
  "confidence": <float 0-1, how confident you are>,
  "tasks": [{"description": "<task>", "priority": "<urgent|high|medium|low>", "due_date": null}],
  "appointment": {"service": "<string or null>", "proposed_time_iso": "<ISO string or null if not yet specified>"},
  "should_auto_reply": <true if AI can handle this, false if needs human>,
  "escalation_reason": "<null or reason why human is needed>",
  "language_detected": "<ISO code like en, hi, es>",
  "summary_update": "<one line summary of what customer wants>"
}

SCORING RULES:
- "ready_to_buy" or "pricing_inquiry" with timeline = HIGH
- "service_inquiry", "meeting_request", "portfolio_request" = MEDIUM
- "greeting" or "general_question" with no commercial intent = LOW
- "complaint" = always escalate, do NOT auto-reply

APPOINTMENT RULES:
- If intent is meeting_request or ready_to_buy, try to extract the service and EXACT ISO 8601 time if provided. Use current year. If time is missing, return null for proposed_time_iso.

AUTO-REPLY RULES:
- Always set "should_auto_reply": true for "greeting", "general_question", "pricing_inquiry", and "service_inquiry".
- For simple greetings like "Hi", set confidence to 1.0 and escalation_reason to null.
- Only set "should_auto_reply": false if intent is "complaint" or user explicitly demands a human.

Return ONLY the JSON object.`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const text = response.choices[0].message.content || '{}';
    return JSON.parse(text);
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
    };
  }
}

/** Generate an auto-reply using business context + RAG knowledge */
export async function generateReply(
  customerMessage: string,
  conversationHistory: string[],
  knowledgeContext: string[],
  businessProfile: { business_name: string; industry: string; services: string[] },
  language: string
): Promise<string> {
  const prompt = `You are a friendly, professional AI assistant for "${businessProfile.business_name || 'our business'}".

BUSINESS INFO:
- Industry: ${businessProfile.industry || 'Services'}
- Services: ${businessProfile.services?.join(', ') || 'Various'}

KNOWLEDGE BASE:
${knowledgeContext.length > 0 ? knowledgeContext.join('\n---\n') : 'No specific knowledge available.'}

RULES:
1. Reply in ${language === 'en' ? 'English' : "the customer's language (" + language + ")"}
2. Be warm, professional, and concise (1-3 sentences). Keep it short like texting a human.
3. DO NOT repeat questions the customer already answered.
4. If they want to buy/schedule: ask for missing details (date, time, service). If all provided, confirm enthusiastically.
5. If you lack specific answers, say you will check with the team.
6. Do NOT use markdown — plain text only.
7. Do NOT include sign-offs like "Best regards" or the business name at the end.
8. Use simple English, human-like texting style with ... if natural. No emojis.`;

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
  const prompt = `You are a friendly, professional AI sales assistant for "${businessProfile.business_name || 'our business'}".
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
4. DO NOT use markdown. Keep it human-like.
5. DO NOT sound robotic.`;

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
