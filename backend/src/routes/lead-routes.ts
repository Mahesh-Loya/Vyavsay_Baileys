import { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const leadRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {

  /** List leads */
  server.get('/', async (request, reply) => {
    const { userId, stage, score } = request.query as { userId?: string; stage?: string; score?: string };

    let query = server.supabase
      .from('wb_leads')
      .select('*, wb_conversations(customer_jid, customer_name, customer_phone, last_message_at)')
      .order('updated_at', { ascending: false });

    if (userId) query = query.eq('user_id', userId);
    if (stage) query = query.eq('stage', stage);
    if (score) query = query.eq('score', score);

    const { data, error } = await query.limit(100);
    if (error) return reply.status(500).send({ error: error.message });
    return reply.send({ leads: data || [] });
  });

  /** Update a lead (stage, notes, score) */
  server.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as { stage?: string; notes?: string; score?: string };

    const { data, error } = await server.supabase
      .from('wb_leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return reply.status(500).send({ error: error.message });
    return reply.send({ lead: data });
  });
};
