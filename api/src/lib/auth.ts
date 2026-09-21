import fs from "fs";
import path from "path";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";

function resolveSecret() {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && !["dev-secret", "troque-este-segredo-em-producao"].includes(fromEnv)) return fromEnv;
  const file = path.join(path.dirname(process.env.DATABASE_PATH || path.join(__dirname, "..", "..", "data.db")), ".jwt-secret");
  try {
    return fs.readFileSync(file, "utf-8").trim();
  } catch {
    const generated = crypto.randomBytes(48).toString("hex");
    fs.writeFileSync(file, generated, { mode: 0o600 });
    return generated;
  }
}

const JWT_SECRET = resolveSecret();

export const getSecret = () => JWT_SECRET;

export function hashPassword(pw: string) {
  return bcrypt.hashSync(pw, 10);
}

export function verifyPassword(pw: string, hash: string) {
  return bcrypt.compareSync(pw, hash);
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "30d" });
}

export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
