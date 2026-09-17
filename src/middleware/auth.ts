import type { Request, Response, NextFunction } from 'express';

export interface DecodedUser {
  uid: string;
  email?: string;
  name?: string;
  [key: string]: any;
}

export interface AuthRequest extends Request {
  user?: DecodedUser;
}

function decodeJwtPayload(token: string): DecodedUser | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    const parsed = JSON.parse(jsonPayload);
    return {
      uid: parsed.user_id || parsed.sub || parsed.uid,
      email: parsed.email,
      name: parsed.name,
      ...parsed,
    };
  } catch {
    return null;
  }
}

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = decodeJwtPayload(token);
    if (decoded && decoded.uid) {
      req.user = decoded;
    }
  } catch (error) {
    console.warn('Optional auth token parsing skipped:', error);
  }
  next();
};

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  const decoded = decodeJwtPayload(token);
  if (!decoded || !decoded.uid) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
  req.user = decoded;
  next();
};
