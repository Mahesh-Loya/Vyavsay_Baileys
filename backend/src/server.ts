import Fastify from 'fastify';
import { config } from './config/environment.js';
import corsPlugin from './plugins/cors-plugin.js';
import supabasePlugin from './plugins/supabase-plugin.js';
import { healthRoutes } from './routes/health-routes.js';
import { sessionRoutes } from './routes/session-routes.js';
import { conversationRoutes } from './routes/conversation-routes.js';
import { leadRoutes } from './routes/lead-routes.js';
import { taskRoutes } from './routes/task-routes.js';
import { sessionManager } from './services/session-manager.js';

// Import to initialize the adapter (sets up message listeners)
import './services/baileys-adapter.js';

const fastify = Fastify({
  logger: {
    transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
  },
});

async function main() {
  // Register plugins
  await fastify.register(corsPlugin);
  await fastify.register(supabasePlugin);

  // Register routes
  await fastify.register(healthRoutes, { prefix: '/api' });
  await fastify.register(sessionRoutes, { prefix: '/api' });
  await fastify.register(conversationRoutes, { prefix: '/api/conversations' });
  await fastify.register(leadRoutes, { prefix: '/api/leads' });
  await fastify.register(taskRoutes, { prefix: '/api/tasks' });

  const { userRoutes } = await import('./routes/user-routes.js');
  await fastify.register(userRoutes, { prefix: '/api/users' });

  const { knowledgeRoutes } = await import('./routes/knowledge-routes.js');
  await fastify.register(knowledgeRoutes, { prefix: '/api/knowledge' });

  // Restore persisted Baileys sessions on startup (non-blocking)
  sessionManager.restoreAllSessions().catch(err => {
    console.error('⚠️ Session restore error:', err.message);
  });

  // Initialize Cron Service
  const { CronService } = await import('./services/cron-service.js');
  const cronService = new CronService(fastify.supabase);
  cronService.init();

  // Start server
  try {
    await fastify.listen({ port: config.PORT, host: '0.0.0.0' });
    console.log(`\n🚀 Vyavsay Baileys API running on http://localhost:${config.PORT}`);
    console.log(`📡 Health: http://localhost:${config.PORT}/api/health`);
    console.log(`📱 Sessions: http://localhost:${config.PORT}/api/sessions\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Handle unhandled rejections to prevent silent crashes
process.on('unhandledRejection', (err) => {
  console.error('⚠️ Unhandled Rejection:', err);
});

main();
