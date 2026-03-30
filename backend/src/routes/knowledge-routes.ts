import { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const knowledgeRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {

  server.get('/', async (request, reply) => {
    const { userId } = request.query as { userId: string };
    if (!userId) return reply.status(400).send({ error: 'userId is required' });

    const { data, error } = await server.supabase
      .from('wb_knowledge_base')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return reply.status(500).send({ error: error.message });
    return reply.send(data);
  });

  server.post('/', async (request, reply) => {
    const { userId, content } = request.body as { userId: string, content: string };
    if (!userId || !content) return reply.status(400).send({ error: 'userId and content are required' });

    try {
      // Use RagService to chunk, embed, and store knowledge
      const { pipelineService } = await import('../services/pipeline-service.js');
      const storedCount = await pipelineService.getRagService().embedAndStore(userId, content);

      if (storedCount === 0) {
        throw new Error('Failed to generate embeddings for knowledge content');
      }

      return reply.send({ success: true, count: storedCount });
    } catch (err: any) {
      console.error('❌ Knowledge sync failed:', err.message);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  server.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.query as { userId: string };

    if (!userId) return reply.status(400).send({ error: 'userId is required' });

    const { error } = await server.supabase
      .from('wb_knowledge_base')
      .delete()
      .match({ id, user_id: userId });

    if (error) return reply.status(500).send({ error: error.message });
    return reply.send({ success: true });
  });
};
