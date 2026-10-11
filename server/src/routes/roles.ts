import { Router, type Request, type Response } from 'express';
import { BUILT_IN_ROLES } from '../prompts.js';

const router = Router();

router.get('/roles', (_req: Request, res: Response) => {
  res.json({ roles: BUILT_IN_ROLES.map(({ id, name }) => ({ id, name })) });
});

router.get('/roles/:id', (req: Request, res: Response) => {
  const role = BUILT_IN_ROLES.find((r) => r.id === req.params.id);
  if (!role) {
    res.status(404).json({ error: `role not found: ${req.params.id}` });
    return;
  }
  res.json(role);
});

export default router;