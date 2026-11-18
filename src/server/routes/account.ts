import { Router } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../../db/index.ts';
import {
  addresses,
  customerProfiles,
  notifications,
  orderItems,
  orders,
  productImages,
  products,
  reviews,
  users,
  wishlists,
} from '../../db/schema.ts';
import { adminAuth } from '../../lib/firebase-admin.ts';
import {
  AuthRequest,
  hashPassword,
  requireAuth,
  signSessionToken,
  upsertFirebaseUser,
  verifyPassword,
} from '../auth.ts';
import { ensureSeeded } from '../seed.ts';

const router = Router();

router.post('/auth/register', async (req, res) => {
  try {
    await ensureSeeded();
    const { email, password, fullName, phone } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes('@') || !password || String(password).length < 6) {
      return res.status(400).json({
        error: 'Veuillez saisir un e-mail valide et un mot de passe d’au moins 6 caractères.',
      });
    }
    if (!fullName?.trim()) {
      return res.status(400).json({ error: 'Veuillez renseigner votre nom complet.' });
    }

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing[0]) {
      return res.status(409).json({ error: 'Un compte existe déjà avec cette adresse e-mail.' });
    }

    const passwordHash = await hashPassword(String(password));
    const [created] = await db
      .insert(users)
      .values({
        uid: `local-${crypto.randomUUID()}`,
        email: normalizedEmail,
        passwordHash,
        fullName: fullName.trim(),
        phone: (phone || '').trim(),
        role: 'customer',
      })
      .returning();

    await db.insert(customerProfiles).values({ userId: created.id });
    await db.insert(notifications).values({
      type: 'new_customer',
      title: `Nouveau client inscrit : ${created.fullName}`,
      message: created.email,
    });

    const authUser = {
      id: created.id,
      uid: created.uid,
      email: created.email,
      fullName: created.fullName,
      phone: created.phone,
      role: 'customer' as const,
    };

    const token = signSessionToken(authUser);
    res.status(201).json({ token, user: authUser });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Impossible de créer le compte.' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    await ensureSeeded();
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Veuillez saisir votre e-mail et votre mot de passe.' });
    }

    const found = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    const user = found[0];

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Ce compte a été désactivé.' });
    }

    const valid = await verifyPassword(String(password), user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    const authUser = {
      id: user.id,
      uid: user.uid,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role === 'admin' ? ('admin' as const) : ('customer' as const),
    };

    const token = signSessionToken(authUser);
    res.json({ token, user: authUser });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion.' });
  }
});

router.post('/auth/google', async (req, res) => {
  try {
    await ensureSeeded();
    const idToken = String(req.body.idToken || '').trim();
    if (!idToken) {
      return res.status(400).json({ error: 'Jeton Google manquant.' });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    if (!decoded.email) {
      return res.status(400).json({ error: 'Adresse e-mail Google non disponible.' });
    }

    const authUser = await upsertFirebaseUser({
      uid: decoded.uid,
      email: decoded.email,
      fullName: decoded.name || decoded.email.split('@')[0],
    });

    const token = signSessionToken(authUser);
    res.json({ token, user: authUser });
  } catch (error) {
    console.error('Google auth sync error:', error);
    res.status(401).json({ error: 'Échec de la vérification Google.' });
  }
});

router.post('/auth/recover', async (req, res) => {
  try {
    await ensureSeeded();
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Veuillez indiquer une adresse e-mail valide.' });
    }
    // Never reveal whether an email exists for security; log request for configured mail service
    res.json({
      message:
        'Si un compte correspond à cette adresse e-mail, les instructions de réinitialisation ont été préparées.',
    });
  } catch (error) {
    console.error('Recover error:', error);
    res.status(500).json({ error: 'Impossible de traiter la demande.' });
  }
});

router.get('/account/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.authUser!.id;
    const [profile] = await db
      .select()
      .from(customerProfiles)
      .where(eq(customerProfiles.userId, userId))
      .limit(1);

    const userAddresses = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, userId))
      .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));

    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    const ordersWithItems = await Promise.all(
      userOrders.map(async (o) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, o.id));
        return { ...o, items };
      })
    );

    const wishlistRows = await db
      .select()
      .from(wishlists)
      .where(eq(wishlists.userId, userId));

    const wishlistItems = [];
    for (const w of wishlistRows) {
      const [prod] = await db
        .select()
        .from(products)
        .where(eq(products.id, w.productId))
        .limit(1);
      if (prod) {
        const imgs = await db
          .select()
          .from(productImages)
          .where(eq(productImages.productId, prod.id));
        wishlistItems.push({
          ...prod,
          primaryImage: imgs.find((i) => i.isPrimary)?.url || imgs[0]?.url || '',
        });
      }
    }

    res.json({
      user: req.authUser,
      profile,
      addresses: userAddresses,
      orders: ordersWithItems,
      wishlist: wishlistItems,
    });
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ error: 'Impossible de charger votre compte.' });
  }
});

router.put('/account/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.authUser!.id;
    const { fullName, phone, defaultCity } = req.body;
    const [updated] = await db
      .update(users)
      .set({
        fullName: String(fullName || req.authUser!.fullName).trim(),
        phone: String(phone || '').trim(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (defaultCity) {
      await db
        .insert(customerProfiles)
        .values({ userId, defaultCity: String(defaultCity).trim() })
        .onConflictDoUpdate({
          target: customerProfiles.userId,
          set: { defaultCity: String(defaultCity).trim(), updatedAt: new Date() },
        });
    }

    res.json({
      user: {
        id: updated.id,
        uid: updated.uid,
        email: updated.email,
        fullName: updated.fullName,
        phone: updated.phone,
        role: updated.role,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Impossible de mettre à jour le profil.' });
  }
});

router.put('/account/password', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.authUser!.id;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({
        error: 'Le nouveau mot de passe doit contenir au moins 6 caractères.',
      });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    if (user.passwordHash) {
      const valid = await verifyPassword(String(currentPassword || ''), user.passwordHash);
      if (!valid) {
        return res.status(400).json({ error: 'Le mot de passe actuel est incorrect.' });
      }
    }

    const newHash = await hashPassword(String(newPassword));
    await db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    res.json({ message: 'Mot de passe mis à jour avec succès.' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Impossible de modifier le mot de passe.' });
  }
});

router.post('/account/addresses', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.authUser!.id;
    const { label, fullName, phone, city, addressLine, postalCode, isDefault } = req.body;
    if (!fullName?.trim() || !phone?.trim() || !city?.trim() || !addressLine?.trim()) {
      return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis.' });
    }

    if (isDefault) {
      await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
    }

    const [created] = await db
      .insert(addresses)
      .values({
        userId,
        label: (label || 'Domicile').trim(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        city: city.trim(),
        addressLine: addressLine.trim(),
        postalCode: (postalCode || '').trim(),
        isDefault: Boolean(isDefault),
      })
      .returning();

    res.status(201).json({ address: created });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({ error: 'Impossible d’enregistrer l’adresse.' });
  }
});

router.delete('/account/addresses/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.authUser!.id;
    const id = Number(req.params.id);
    await db
      .delete(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ error: 'Impossible de supprimer l’adresse.' });
  }
});

router.post('/account/wishlist/:productId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.authUser!.id;
    const productId = Number(req.params.productId);
    const existing = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)))
      .limit(1);

    if (existing[0]) {
      await db.delete(wishlists).where(eq(wishlists.id, existing[0].id));
      return res.json({ wishlisted: false });
    }

    await db.insert(wishlists).values({ userId, productId });
    res.json({ wishlisted: true });
  } catch (error) {
    console.error('Wishlist toggle error:', error);
    res.status(500).json({ error: 'Impossible de mettre à jour la liste de souhaits.' });
  }
});

router.post('/products/:id/reviews', async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const productId = Number(req.params.id);
    const { authorName, rating, comment } = req.body;
    const numRating = Math.min(5, Math.max(1, Number(rating || 5)));

    if (!authorName?.trim() || !comment?.trim()) {
      return res.status(400).json({ error: 'Veuillez renseigner votre nom et votre avis.' });
    }

    const [created] = await db
      .insert(reviews)
      .values({
        productId,
        userId: req.authUser?.id ?? null,
        authorName: authorName.trim(),
        authorRole: 'Client vérifié',
        rating: numRating,
        comment: comment.trim(),
        isApproved: true,
        isStoreTestimonial: false,
        isSample: false,
      })
      .returning();

    res.status(201).json({ review: created });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Impossible d’enregistrer votre avis.' });
  }
});

export default router;
