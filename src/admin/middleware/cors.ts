import cors from 'cors';

export const corsMiddleware = () => {
  // Admin UI origin(s) — distinct from the main app's CORS_ORIGIN.
  const corsOriginsEnv = process.env.ADMIN_CORS_ORIGIN || 'http://localhost:3001,http://127.0.0.1:3001';
  const allowed = corsOriginsEnv.split(',').map((o) => o.trim()).filter((o) => o.length > 0);

  return cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowed.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  });
};
