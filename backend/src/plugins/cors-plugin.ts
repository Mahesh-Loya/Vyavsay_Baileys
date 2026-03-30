import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { config } from '../config/environment.js';

export default fp(async (fastify) => {
  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Allow any localhost origin in development
      if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        cb(null, true);
      } else {
        cb(new Error('CORS not allowed'), false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
});
