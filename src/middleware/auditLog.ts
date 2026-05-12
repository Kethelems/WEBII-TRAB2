import { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma';

export function auditLog(summary: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const pathOnly = (req.originalUrl || req.path || '').split('?')[0] || req.path;

    try {
      await prisma.auditLog.create({
        data: {
          method: req.method,
          path: pathOnly,
          summary,
          userId: req.session.user?.id ?? null,
          userEmail: req.session.user?.email ?? null,
        },
      });
    } catch {
      // não bloqueia a requisição
    }

    next();
  };
}
