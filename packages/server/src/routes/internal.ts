import { Router, Request, Response } from 'express';
import { ServerService } from '../services/ServerService';
import logger from '../utils/logger';

/**
 * Internal routes for cross-node command routing.
 * These routes call the LOCAL adapter directly, bypassing the remote check in getAdapter().
 */
export function createInternalRoutes(serverService: ServerService): Router {
  const router = Router();

  router.post('/servers/:id/start', async (req: Request, res: Response) => {
    try {
      await serverService.startServer((req.params.id as string));
      res.json({ ok: true });
    } catch (err: any) {
      logger.error(`[Internal] start failed for ${req.params.id}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/servers/:id/stop', async (req: Request, res: Response) => {
    try {
      await serverService.stopServer((req.params.id as string));
      res.json({ ok: true });
    } catch (err: any) {
      logger.error(`[Internal] stop failed for ${req.params.id}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/servers/:id/restart', async (req: Request, res: Response) => {
    try {
      await serverService.restartServer((req.params.id as string));
      res.json({ ok: true });
    } catch (err: any) {
      logger.error(`[Internal] restart failed for ${req.params.id}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/servers/:id/kill', async (req: Request, res: Response) => {
    try {
      await serverService.killServer((req.params.id as string));
      res.json({ ok: true });
    } catch (err: any) {
      logger.error(`[Internal] kill failed for ${req.params.id}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/servers/:id/command', async (req: Request, res: Response) => {
    try {
      const { command } = req.body;
      if (!command || typeof command !== 'string') {
        res.status(400).json({ error: 'Missing "command" string in body' });
        return;
      }

      const adapter = await serverService.getLocalAdapter((req.params.id as string));
      const result = await adapter.sendCommand(command);
      res.json(result);
    } catch (err: any) {
      logger.error(`[Internal] command failed for ${req.params.id}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/servers/:id/status', async (req: Request, res: Response) => {
    try {
      const adapter = await serverService.getLocalAdapter((req.params.id as string));
      const status = await adapter.getStatus();
      res.json(status);
    } catch (err: any) {
      logger.error(`[Internal] status failed for ${req.params.id}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/servers/:id/metrics', async (req: Request, res: Response) => {
    try {
      const adapter = await serverService.getLocalAdapter((req.params.id as string));
      const metrics = await adapter.getMetrics();
      res.json(metrics);
    } catch (err: any) {
      logger.error(`[Internal] metrics failed for ${req.params.id}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
