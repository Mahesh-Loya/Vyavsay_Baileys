import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { sessionManager } from '../services/session-manager.js';
import { reminderService } from '../services/reminder-service.js';

const startTime = Date.now();

export const healthRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {

  server.get('/health', async (_request, reply) => {
    const uptimeMs = Date.now() - startTime;
    const hours = Math.floor(uptimeMs / 3600000);
    const minutes = Math.floor((uptimeMs % 3600000) / 60000);

    const sessions = sessionManager.getAllSessions();
    const connected = sessions.filter(s => s.status === 'connected').length;

    return reply.send({
      status: 'ok',
      uptime: `${hours}h ${minutes}m`,
      sessions: {
        total: sessions.length,
        connected,
        disconnected: sessions.length - connected,
      },
      activeReminders: reminderService.activeCount,
    });
  });

  /** Analytics / dashboard metrics */
  server.get('/analytics', async (request, reply) => {
    try {
      const { userId } = request.query as { userId?: string };

      const queries = await Promise.all([
        server.supabase.from('wb_conversations').select('id', { count: 'exact' }).match(userId ? { user_id: userId } : {}),
        server.supabase.from('wb_messages').select('id', { count: 'exact' }),
        server.supabase.from('wb_leads').select('id, score, stage', { count: 'exact' }).match(userId ? { user_id: userId } : {}),
        server.supabase.from('wb_tasks').select('id, is_completed', { count: 'exact' }).match(userId ? { user_id: userId } : {}),
        server.supabase.from('wb_messages').select('sender, created_at').eq('sender', 'ai').order('created_at', { ascending: false }).limit(500),
      ]);

      const [convos, msgs, leads, tasks, aiMsgs] = queries;

      // Check for Supabase errors in any of the queries
      const errors = queries.filter((q: any) => q.error).map((q: any) => q.error);
      if (errors.length > 0) {
        server.log.error({ errors }, 'Supabase query errors in analytics');
        return reply.status(500).send({ error: 'Database query failed', details: errors });
      }

      // Lead distribution
      const leadsByScore = { high: 0, medium: 0, low: 0 };
      const leadsByStage: Record<string, number> = {};
      (leads.data || []).forEach((l: any) => {
        if (l.score in leadsByScore) leadsByScore[l.score as keyof typeof leadsByScore]++;
        leadsByStage[l.stage] = (leadsByStage[l.stage] || 0) + 1;
      });

      // Task stats
      const completedTasks = (tasks.data || []).filter((t: any) => t.is_completed).length;

      return reply.send({
        totalConversations: convos.count || 0,
        totalMessages: msgs.count || 0,
        totalLeads: leads.count || 0,
        leadsByScore,
        leadsByStage,
        totalTasks: tasks.count || 0,
        completedTasks,
        aiMessagesCount: aiMsgs.data?.length || 0,
      });
    } catch (err: any) {
      server.log.error(err, 'Critical error in analytics route');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });
};
