import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { adminUsers, customerProfiles, users } from '../db/schema.ts';
import { adminAuth } from '../lib/firebase-admin.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'librairie-amine-ait-melloul-dev-secret-2026';

export interface AuthUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  role: 'customer' | 'admin';
}

export interface AuthRequest extends Request {
  authUser?: AuthUser;
}

export function signSessionToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      uid: user.uid,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function upsertFirebaseUser(params: {
  uid: string;
  email: string;
  fullName?: string;
}): Promise<AuthUser> {
  try {
    const adminEmailEnv = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const isDesignatedAdmin =
      adminEmailEnv.length > 0 && params.email.trim().toLowerCase() === adminEmailEnv;

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, params.email.toLowerCase()))
      .limit(1);

    let record = existing[0];
    if (!record) {
      const inserted = await db
        .insert(users)
        .values({
          uid: params.uid,
          email: params.email.toLowerCase(),
          fullName: params.fullName || params.email.split('@')[0],
          role: isDesignatedAdmin ? 'admin' : 'customer',
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            email: params.email.toLowerCase(),
            fullName: params.fullName || params.email.split('@')[0],
            updatedAt: new Date(),
          },
        })
        .returning();
      record = inserted[0];
    } else if (record.uid !== params.uid) {
      const updated = await db
        .update(users)
        .set({ uid: params.uid, updatedAt: new Date() })
        .where(eq(users.id, record.id))
        .returning();
      record = updated[0];
    }

    await db
      .insert(customerProfiles)
      .values({ userId: record.id })
      .onConflictDoNothing();

    if (record.role === 'admin') {
      await db
        .insert(adminUsers)
        .values({ userId: record.id, lastLoginAt: new Date() })
        .onConflictDoUpdate({
          target: adminUsers.userId,
          set: { lastLoginAt: new Date() },
        });
    }

    return {
      id: record.id,
      uid: record.uid,
      email: record.email,
      fullName: record.fullName,
      phone: record.phone,
      role: record.role === 'admin' ? 'admin' : 'customer',
    };
  } catch (error) {
    console.error('Failed to upsert Firebase user:', error);
    throw new Error('Erreur lors de la synchronisation du compte utilisateur.', {
      cause: error,
    });
  }
}

export async function resolveRequestUser(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!bearerToken) {
    return null;
  }

  // First try local JWT session token
  try {
    const decoded = jwt.verify(bearerToken, JWT_SECRET) as {
      id: number;
      uid: string;
      email: string;
      role: string;
    };
    const found = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
    if (found[0] && found[0].isActive) {
      return {
        id: found[0].id,
        uid: found[0].uid,
        email: found[0].email,
        fullName: found[0].fullName,
        phone: found[0].phone,
        role: found[0].role === 'admin' ? 'admin' : 'customer',
      };
    }
  } catch {
    // Fall through to Firebase ID token verification
  }

  // Verify Firebase ID Token
  try {
    const decodedFirebase = await adminAuth.verifyIdToken(bearerToken);
    if (decodedFirebase.email) {
      return await upsertFirebaseUser({
        uid: decodedFirebase.uid,
        email: decodedFirebase.email,
        fullName: decodedFirebase.name || decodedFirebase.email.split('@')[0],
      });
    }
  } catch {
    return null;
  }

  return null;
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  req.authUser = (await resolveRequestUser(req)) ?? undefined;
  next();
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const user = await resolveRequestUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentification requise. Veuillez vous connecter.' });
  }
  req.authUser = user;
  next();
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const user = await resolveRequestUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentification administrateur requise.' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé : droits administrateur requis.' });
  }
  req.authUser = user;
  next();
}
