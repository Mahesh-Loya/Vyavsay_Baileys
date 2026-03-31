import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { validate, taskUpdate } from '../utils/validation.js';

export const taskRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {

  server.get('/', async (request, reply) => {
    const { completed } = request.query as { completed?: string };
    let query = server.supabase
      .from('wb_tasks')
      .select('*')
      .eq('user_id', request.userId)
      .order('created_at', { ascending: false });

    if (completed === 'true') query = query.eq('is_completed', true);
    if (completed === 'false') query = query.eq('is_completed', false);

    const { data, error } = await query.limit(100);
    if (error) return reply.status(500).send({ error: 'Failed to fetch tasks' });
    return reply.send({ tasks: data || [] });
  });

  server.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updates = validate(taskUpdate, request.body, reply);
    if (!updates) return;

    const { data, error } = await server.supabase
      .from('wb_tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', request.userId)
      .select()
      .single();

    if (error) return reply.status(500).send({ error: 'Failed to update task' });
    return reply.send({ task: data });
  });
};
