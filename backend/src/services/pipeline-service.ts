import { SupabaseClient } from '@supabase/supabase-js';
import { analyzeMessage, generateReply, generateSummary, AnalysisResult } from './ai-router.js';
import { RagService } from './rag-service.js';
import { CatalogService } from './catalog-service.js';
import { baileysAdapter } from './baileys-adapter.js';
import { reminderService } from './reminder-service.js';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/environment.js';

/** Intents that should trigger inventory search */
const INVENTORY_INTENTS = [
  'inventory_inquiry',
  'inventory_browse',
  'inventory_compare',
  'pricing_inquiry',
  'ready_to_buy',
];

/**
 * PipelineService — the AI orchestrator.
 * Flow: Store → Analyze → Route (Inventory or Knowledge) → Score Lead → Extract Tasks → Auto-Reply
 */
export class PipelineService {
  private rag: RagService;
  private catalog: CatalogService;

  constructor(private supabase: SupabaseClient) {
    this.rag = new RagService(supabase);
    this.catalog = new CatalogService(supabase, this.rag);
  }

  getRagService(): RagService {
    return this.rag;
  }

  getCatalogService(): CatalogService {
    return this.catalog;
  }

  async processIncomingMessage(
    userId: string,
    customerJid: string,
    customerName: string,
    customerPhone: string,
    messageText: string
  ): Promise<{ success: boolean; autoReplied: boolean; analysis: any }> {

    // 1. Fetch or create user
    let { data: user } = await this.supabase
      .from('wb_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!user) {
      const { data: newUser } = await this.supabase
        .from('wb_users')
        .insert({
          id: userId,
          email: `${userId.slice(0, 8)}@demo.com`,
          business_name: 'Demo Business',
          auto_reply_enabled: true,
        })
        .select()
        .single();
      user = newUser;
    }

    if (!user) {
      console.warn(`❌ [Pipeline] Could not find/create user ${userId.slice(0, 8)}`);
      return { success: false, autoReplied: false, analysis: null };
    }

    // 2. Find or create conversation
    let { data: conversation } = await this.supabase
      .from('wb_conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('customer_jid', customerJid)
      .single();

    if (!conversation) {
      const { data: newConvo } = await this.supabase
        .from('wb_conversations')
        .insert({
          user_id: userId,
          customer_jid: customerJid,
          customer_name: customerName,
          customer_phone: customerPhone,
          status: 'active',
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();
      conversation = newConvo;
    } else {
      await this.supabase
        .from('wb_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          customer_name: customerName,
        })
        .eq('id', conversation.id);
    }

    if (!conversation) {
      console.warn(`❌ [Pipeline] Failed to find/create conversation`);
      return { success: false, autoReplied: false, analysis: null };
    }

    // 3. Store incoming message
    await this.supabase.from('wb_messages').insert({
      conversation_id: conversation.id,
      sender: 'customer',
      content: messageText,
    });

    // 4. Get conversation history for context
    const { data: history } = await this.supabase
      .from('wb_messages')
      .select('sender, content')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(20);

    const historyStrings = (history || []).map(
      (m: any) => `${m.sender}: ${m.content}`
    );

    // 5. Run AI analysis (now includes entity extraction)
    const analysis = await analyzeMessage(messageText, historyStrings, {
      business_name: user.business_name || '',
      industry: user.industry || '',
      services: user.services || [],
    });

    console.log(`\n[Pipeline] AI Analysis for "${messageText.slice(0, 50)}...":`);
    console.log(`  Intent: ${analysis.intent} | Score: ${analysis.lead_score} | QueryType: ${analysis.query_type}`);
    if (analysis.entities) {
      console.log(`  Entities:`, JSON.stringify(analysis.entities));
    }

    // 6. Update message with detected intent
    await this.supabase
      .from('wb_messages')
      .update({ intent: analysis.intent, confidence: analysis.confidence })
      .eq('conversation_id', conversation.id)
      .eq('content', messageText)
      .order('created_at', { ascending: false })
      .limit(1);

    // 7. Create or update lead
    await this.upsertLead(userId, conversation.id, customerName, analysis);

    // 8. Create extracted tasks
    for (const task of analysis.tasks) {
      await this.supabase.from('wb_tasks').insert({
        user_id: userId,
        conversation_id: conversation.id,
        title: task.description,
        due_date: task.due_date,
        is_completed: false,
      });
    }

    // 8.5. Schedule appointment reminders
    if (analysis.appointment?.proposed_time_iso) {
      const serviceName = analysis.appointment.service || 'General Service';
      await this.supabase.from('wb_tasks').insert({
        user_id: userId,
        conversation_id: conversation.id,
        title: `📅 Appointment: ${customerName} — ${serviceName}`,
        due_date: analysis.appointment.proposed_time_iso.split('T')[0],
        is_completed: false,
      });

      reminderService.scheduleReminders(userId, customerJid, customerName, serviceName, analysis.appointment.proposed_time_iso);

      historyStrings.push(`System: Appointment for ${analysis.appointment.proposed_time_iso} for ${serviceName} has been booked! Confirm warmly.`);
    } else if (analysis.appointment && !analysis.appointment.proposed_time_iso) {
      historyStrings.push(`System: Customer wants to book but hasn't specified time. Ask for preferred date and time.`);
    }

    // 9. Update conversation summary
    if (historyStrings.length >= 3) {
      const summary = await generateSummary(historyStrings);
      await this.supabase
        .from('wb_conversations')
        .update({ summary, language: analysis.language_detected })
        .eq('id', conversation.id);
    }

    // ──────────────────────────────────────────────
    // 10. SMART CONTEXT FETCHING
    // Route to inventory OR knowledge base based on intent
    // ──────────────────────────────────────────────

    let knowledgeChunks: string[] = [];
    let inventoryContext: { items: any[]; soldItems?: any[]; alternatives?: any[] } | null = null;

    const isInventoryQuery = INVENTORY_INTENTS.includes(analysis.intent) || analysis.query_type !== 'general';

    if (isInventoryQuery && analysis.entities) {
      // INVENTORY PATH — search catalog with extracted entities
      console.log(`  [Pipeline] → Routing to INVENTORY search`);

      const result = await this.catalog.searchWithAlternatives(userId, messageText, {
        product_name: analysis.entities.product_name || undefined,
        category: analysis.entities.category || analysis.entities.brand || undefined,
        price_min: analysis.entities.price_min || undefined,
        price_max: analysis.entities.price_max || undefined,
        attributes: analysis.entities.attributes || undefined,
      });

      const available = result.exact.filter(i => i.quantity > 0);
      const sold = result.exact.filter(i => i.quantity <= 0);

      inventoryContext = {
        items: available,
        soldItems: sold.length > 0 ? sold : undefined,
        alternatives: result.alternatives.length > 0 ? result.alternatives : undefined,
      };

      console.log(`  [Pipeline] Inventory results: ${available.length} available, ${sold.length} sold, ${result.alternatives.length} alternatives`);

      // If no inventory results, also search knowledge base as fallback
      if (available.length === 0 && sold.length === 0) {
        console.log(`  [Pipeline] → No inventory match, falling back to knowledge base`);
        knowledgeChunks = await this.rag.searchKnowledge(userId, messageText);
      }
    } else {
      // KNOWLEDGE PATH — general question, search text knowledge base
      console.log(`  [Pipeline] → Routing to KNOWLEDGE BASE search`);
      knowledgeChunks = await this.rag.searchKnowledge(userId, messageText);
    }

    // ──────────────────────────────────────────────
    // 11. AUTO-REPLY DECISION
    // ──────────────────────────────────────────────

    let autoReplied = false;

    const autoReplyIntents = [
      'greeting', 'general_question', 'pricing_inquiry', 'service_inquiry',
      'inventory_inquiry', 'inventory_browse',
    ];

    const shouldReply =
      user.auto_reply_enabled &&
      !conversation.ai_paused &&
      analysis.should_auto_reply &&
      (analysis.confidence >= (user.ai_confidence_threshold || 0.75) ||
        autoReplyIntents.includes(analysis.intent)) &&
      !analysis.escalation_reason;

    if (shouldReply) {
      // Generate reply with both inventory and knowledge context
      const replyText = await generateReply(
        messageText,
        historyStrings,
        knowledgeChunks,
        {
          business_name: user.business_name || '',
          industry: user.industry || '',
          services: user.services || [],
        },
        analysis.language_detected,
        inventoryContext
      );

      // Send product image FIRST if we have a specific match with images
      if (inventoryContext?.items && inventoryContext.items.length <= 3) {
        for (const item of inventoryContext.items) {
          const images = Array.isArray(item.images) ? item.images : [];
          const primaryImage = images.sort((a: any, b: any) => (a.order || 0) - (b.order || 0))[0];
          if (primaryImage?.url) {
            const price = item.price
              ? (item.price >= 100000 ? `₹${(item.price / 100000).toFixed(1)}L` : `₹${item.price}`)
              : '';
            const caption = `${item.item_name}${price ? ` — ${price}` : ''}`;
            await baileysAdapter.sendImage(userId, customerJid, primaryImage.url, caption);
          }
        }
      }

      // Send text reply
      const sent = await baileysAdapter.sendMessage(userId, customerJid, replyText);
      if (sent) {
        await this.supabase.from('wb_messages').insert({
          conversation_id: conversation.id,
          sender: 'ai',
          content: replyText,
        });
        autoReplied = true;
      }
    } else if (user.auto_reply_enabled && !analysis.escalation_reason) {
      // Fallback acknowledgement
      const fallback = "Thanks for reaching out! I've noted your message and someone from our team will get back to you shortly.";
      const sent = await baileysAdapter.sendMessage(userId, customerJid, fallback);
      if (sent) {
        await this.supabase.from('wb_messages').insert({
          conversation_id: conversation.id,
          sender: 'ai',
          content: fallback,
        });
        autoReplied = true;
      }
    }

    return { success: true, autoReplied, analysis };
  }

  /** Upsert lead — create new or upgrade score if higher */
  private async upsertLead(
    userId: string,
    conversationId: string,
    customerName: string,
    analysis: AnalysisResult
  ): Promise<void> {
    const { data: existingLead } = await this.supabase
      .from('wb_leads')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    if (existingLead) {
      const scorePriority: Record<string, number> = { high: 3, medium: 2, low: 1 };
      if ((scorePriority[analysis.lead_score] || 0) > (scorePriority[existingLead.score] || 0)) {
        await this.supabase
          .from('wb_leads')
          .update({
            score: analysis.lead_score,
            intent: analysis.intent,
            summary: analysis.summary_update,
            customer_name: customerName,
          })
          .eq('id', existingLead.id);
      }
    } else {
      await this.supabase.from('wb_leads').insert({
        user_id: userId,
        conversation_id: conversationId,
        customer_name: customerName,
        score: analysis.lead_score,
        stage: 'new',
        intent: analysis.intent,
        summary: analysis.summary_update,
      });
    }
  }
}

// Singleton with service role client
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
export const pipelineService = new PipelineService(supabase);
