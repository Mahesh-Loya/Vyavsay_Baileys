import { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const userRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {

  /** Get user profile/settings (Auto-create if missing) */
  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    let { data, error } = await server.supabase
      .from('wb_users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code === 'PGRST116') {
      // Not found, create it
      const { data: newUser, error: createError } = await server.supabase
        .from('wb_users')
        .insert({ id })
        .select()
        .single();
      
      if (createError) return reply.status(500).send({ error: createError.message });
      data = newUser;
    } else if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.send({ user: data });
  });

  /** Update user settings */
  server.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const { data, error } = await server.supabase
      .from('wb_users')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) return reply.status(500).send({ error: error.message });
    return reply.send({ user: data });
  });
};
