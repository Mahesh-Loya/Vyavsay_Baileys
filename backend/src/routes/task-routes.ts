import { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const taskRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {

  /** List tasks */
  server.get('/', async (request, reply) => {
    const { userId, completed } = request.query as { userId?: string; completed?: string };

    let query = server.supabase
      .from('wb_tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) query = query.eq('user_id', userId);
    if (completed === 'true') query = query.eq('is_completed', true);
    if (completed === 'false') query = query.eq('is_completed', false);

    const { data, error } = await query.limit(100);
    if (error) return reply.status(500).send({ error: error.message });
    return reply.send({ tasks: data || [] });
  });

  /** Toggle task completion */
  server.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as { is_completed?: boolean; title?: string; due_date?: string };

    const { data, error } = await server.supabase
      .from('wb_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return reply.status(500).send({ error: error.message });
    return reply.send({ task: data });
  });
};
