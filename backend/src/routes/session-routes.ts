import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { sessionManager } from '../services/session-manager.js';
import QRCode from 'qrcode';

export const sessionRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {

  /** Create a new Baileys session for the authenticated user */
  server.post('/sessions', async (request, reply) => {
    const userId = request.userId;

    try {
      const session = await sessionManager.createSession(userId);
      return reply.send({
        success: true,
        sessionId: userId,
        status: session.status,
      });
    } catch (err: any) {
      console.error('❌ Create session error:', err.message);
      return reply.status(500).send({ success: false, error: 'Failed to create session' });
    }
  });

  /** Poll session status + QR code */
  server.get('/sessions/:userId/status', async (request, reply) => {
    const { userId: paramUserId } = request.params as { userId: string };
    const userId = request.userId;

    // Users can only check their own session
    if (paramUserId !== userId) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

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

  /** List all sessions for the authenticated user */
  server.get('/sessions', async (request, reply) => {
    const userId = request.userId;
    const allSessions = sessionManager.getAllSessions();

    // Only return this user's sessions
    const userSessions = allSessions
      .filter(s => s.userId === userId)
      .map(s => ({
        userId: s.userId,
        status: s.status,
        phone: s.phone || null,
        connectedAt: s.connectedAt?.toISOString() || null,
      }));

    return reply.send({ sessions: userSessions });
  });

  /** Destroy a session — verify ownership */
  server.delete('/sessions/:userId', async (request, reply) => {
    const { userId: paramUserId } = request.params as { userId: string };
    const userId = request.userId;

    if (paramUserId !== userId) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    await sessionManager.destroySession(userId, true);
    return reply.send({ success: true, message: 'Session destroyed' });
  });

  /** Restart a session — verify ownership */
  server.post('/sessions/:userId/restart', async (request, reply) => {
    const { userId: paramUserId } = request.params as { userId: string };
    const userId = request.userId;

    if (paramUserId !== userId) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    try {
      const session = await sessionManager.restartSession(userId);
      return reply.send({ success: true, status: session.status });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: 'Failed to restart session' });
    }
  });
};
