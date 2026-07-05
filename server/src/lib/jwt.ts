import jwt from "jsonwebtoken";
import { config } from "./config";

export interface TokenPayload {
  userId: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
}

export interface OwnerTokenPayload {
  ownerId: string;
  kind: "owner";
}

export function signOwnerToken(ownerId: string): string {
  return jwt.sign({ ownerId, kind: "owner" }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
}

export function verifyOwnerToken(token: string): OwnerTokenPayload {
  const payload = jwt.verify(token, config.jwtSecret) as OwnerTokenPayload;
  if (payload.kind !== "owner") throw new Error("Token no es de propietario");
  return payload;
}
