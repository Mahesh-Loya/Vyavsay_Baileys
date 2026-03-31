import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { validate, userUpdate } from '../utils/validation.js';

export const userRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {

  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (id !== request.userId) return reply.status(403).send({ error: 'Forbidden' });

    let { data, error } = await server.supabase
      .from('wb_users')
      .select('*')
      .eq('id', request.userId)
      .single();

    if (error && error.code === 'PGRST116') {
      const { data: newUser, error: createError } = await server.supabase
        .from('wb_users')
        .insert({ id: request.userId })
        .select()
        .single();
      if (createError) return reply.status(500).send({ error: 'Failed to create user profile' });
      data = newUser;
    } else if (error) {
      return reply.status(500).send({ error: 'Failed to fetch user profile' });
    }

    return reply.send({ user: data });
  });

  server.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (id !== request.userId) return reply.status(403).send({ error: 'Forbidden' });

    const updates = validate(userUpdate, request.body, reply);
    if (!updates) return;

    const { data, error } = await server.supabase
      .from('wb_users')
      .update(updates)
      .eq('id', request.userId)
      .select()
      .single();

    if (error) return reply.status(500).send({ error: 'Failed to update user profile' });
    return reply.send({ user: data });
  });
};
