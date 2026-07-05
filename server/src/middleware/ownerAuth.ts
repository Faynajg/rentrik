import { NextFunction, Request, Response } from "express";
import { verifyOwnerToken } from "../lib/jwt";
import { ApiError } from "../lib/errors";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      ownerId?: string;
    }
  }
}

/** Exige un JWT de propietario válido (portal de solo lectura). */
export function requireOwnerAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new ApiError(401, "No autenticado");
  try {
    const payload = verifyOwnerToken(header.slice(7));
    req.ownerId = payload.ownerId;
    next();
  } catch {
    throw new ApiError(401, "Token inválido o expirado");
  }
}
