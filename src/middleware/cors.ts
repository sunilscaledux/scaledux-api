import cors from 'cors';



export const corsMiddleware = () => {
  // Parse CORS origins from environment variable
  const corsOriginsEnv = process.env.CORS_ORIGIN || '';
  const corsAllowedOrigins = corsOriginsEnv.split(',').filter((o) => o.trim().length > 0);

  return cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const allowed = corsAllowedOrigins;
      if (!origin || allowed.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Session', 'X-Requested-With'],
    credentials: true,
  });
};


