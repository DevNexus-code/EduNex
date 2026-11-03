import { Router, Request, Response } from 'express';
import { config } from '../../common/config/index.js';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: config.NODE_ENV,
    checks: {
      system: 'ok'
    }
  });
});
