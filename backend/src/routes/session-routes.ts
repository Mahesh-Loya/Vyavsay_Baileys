import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { sessionManager } from '../services/session-manager.js';
import QRCode from 'qrcode';

export const sessionRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {

  /** Create a new Baileys session */
  server.post('/sessions', async (request, reply) => {
    const { userId } = request.body as { userId: string };

    if (!userId) {
      return reply.status(400).send({ success: false, error: 'userId is required' });
    }

    try {
      const session = await sessionManager.createSession(userId);
      return reply.send({
        success: true,
        sessionId: userId,
        status: session.status,
      });
    } catch (err: any) {
      console.error('❌ Create session error:', err.message);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  /** Poll session status + QR code (the primary method for QR delivery) */
  server.get('/sessions/:userId/status', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const session = sessionManager.getSession(userId);

    if (!session) {
      return reply.send({ status: 'no_session', qrDataUrl: null, phone: null });
    }

    let qrDataUrl: string | null = null;
    if (session.qr) {
      try {
        qrDataUrl = await QRCode.toDataURL(session.qr);
      } catch {
        console.error('QR encode error');
      }
    }

    return reply.send({
      status: session.status,
      qrDataUrl,
      phone: session.phone || null,
      connectedAt: session.connectedAt?.toISOString() || null,
    });
  });

  /** List all sessions */
  server.get('/sessions', async (_request, reply) => {
    const sessions = sessionManager.getAllSessions().map(s => ({
      userId: s.userId,
      status: s.status,
      phone: s.phone || null,
      connectedAt: s.connectedAt?.toISOString() || null,
    }));
    return reply.send({ sessions });
  });

  /** Destroy a session */
  server.delete('/sessions/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    await sessionManager.destroySession(userId, true);
    return reply.send({ success: true, message: 'Session destroyed' });
  });

  /** Restart a session */
  server.post('/sessions/:userId/restart', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    try {
      const session = await sessionManager.restartSession(userId);
      return reply.send({ success: true, status: session.status });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });
};
