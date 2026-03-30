import { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const conversationRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {

  /** List all conversations for a user */
  server.get('/', async (request, reply) => {
    const { userId, status } = request.query as { userId?: string; status?: string };

    let query = server.supabase
      .from('wb_conversations')
      .select('*, wb_leads(score, stage, intent)')
      .order('last_message_at', { ascending: false });

    if (userId) query = query.eq('user_id', userId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.limit(50);

    if (error) return reply.status(500).send({ error: error.message });
    return reply.send({ conversations: data || [] });
  });

  /** Get a single conversation with messages */
  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data: conversation } = await server.supabase
      .from('wb_conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (!conversation) return reply.status(404).send({ error: 'Conversation not found' });

    const { data: messages } = await server.supabase
      .from('wb_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    return reply.send({ conversation, messages: messages || [] });
  });

  /** Get messages for a conversation */
  server.get('/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { limit: lim } = request.query as { limit?: string };

    const { data, error } = await server.supabase
      .from('wb_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(parseInt(lim || '100'));

    if (error) return reply.status(500).send({ error: error.message });
    return reply.send({ messages: data || [] });
  });

  /** Update conversation (e.g., pause/resume AI) */
  server.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, any>;

    const { data, error } = await server.supabase
      .from('wb_conversations')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) return reply.status(500).send({ error: error.message });
    return reply.send({ conversation: data });
  });

  /** Send a manual message from the dashboard */
  server.post('/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { sender, content, userId } = request.body as { sender: string; content: string; userId: string };

    // Store the message in the database
    const { error: insertError } = await server.supabase.from('wb_messages').insert({
      conversation_id: id,
      sender,
      content,
    });

    if (insertError) return reply.status(500).send({ error: insertError.message });

    // Get conversation to find the customer JID
    const { data: convo } = await server.supabase
      .from('wb_conversations')
      .select('customer_jid')
      .eq('id', id)
      .single();

    // Send via Baileys if session is active
    if (convo?.customer_jid) {
      try {
        const { baileysAdapter } = await import('../services/baileys-adapter.js');
        await baileysAdapter.sendMessage(userId, convo.customer_jid, content);
      } catch (err: any) {
        console.warn(`⚠️ Could not send via WhatsApp: ${err.message}`);
      }
    }

    return reply.send({ success: true });
  });
};
