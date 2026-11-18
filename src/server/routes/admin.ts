import { Router } from 'express';
import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from '../../db/index.ts';
import {
  adminActivityLogs,
  brands,
  categories,
  contactMessages,
  coupons,
  customerProfiles,
  deliveries,
  deliveryZones,
  inventoryMovements,
  newsletters,
  notifications,
  orderItems,
  orders,
  payments,
  productImages,
  products,
  reviews,
  storeSettings,
  suppliers,
  users,
} from '../../db/schema.ts';
import { parseProductsCsv, slugify } from '../../lib/commerce.ts';
import { AuthRequest, hashPassword, requireAdmin } from '../auth.ts';
import { DEFAULT_STORE_SETTINGS, ensureSeeded, logAdminAction } from '../seed.ts';

const router = Router();

router.use(requireAdmin);

// Helper to ensure unique slug
async function uniqueProductSlug(base: string): Promise<string> {
  const clean = slugify(base) || `produit-${Date.now()}`;
  const existing = await db.select().from(products).where(eq(products.slug, clean)).limit(1);
  if (!existing[0]) return clean;
  return `${clean}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// 1. DASHBOARD OVERVIEW & ANALYTICS
router.get('/overview', async (req, res) => {
  try {
    await ensureSeeded();
    const fromParam = req.query.from ? new Date(String(req.query.from)) : null;
    const toParam = req.query.to ? new Date(String(req.query.to)) : null;

    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const allProducts = await db.select().from(products);
    const allCustomers = await db.select().from(users).where(eq(users.role, 'customer'));
    const allCats = await db.select().from(categories);
    const catMap = new Map(allCats.map((c) => [c.id, c.name]));

    const filteredOrders = allOrders.filter((o) => {
      if (o.status === 'cancelled') return false;
      const d = new Date(o.createdAt);
      if (fromParam && !Number.isNaN(fromParam.getTime()) && d < fromParam) return false;
      if (toParam && !Number.isNaN(toParam.getTime())) {
        const end = new Date(toParam);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthPrefix = now.toISOString().slice(0, 7);

    const totalRevenue = filteredOrders.reduce((s, o) => s + parseFloat(o.totalAmount), 0);
    const todaySales = allOrders
      .filter((o) => o.status !== 'cancelled' && new Date(o.createdAt).toISOString().slice(0, 10) === todayStr)
      .reduce((s, o) => s + parseFloat(o.totalAmount), 0);
    const monthSales = allOrders
      .filter((o) => o.status !== 'cancelled' && new Date(o.createdAt).toISOString().slice(0, 7) === monthPrefix)
      .reduce((s, o) => s + parseFloat(o.totalAmount), 0);

    const pendingOrders = allOrders.filter((o) => o.status === 'pending').length;
    const outOfStockCount = allProducts.filter((p) => p.stockQuantity <= 0).length;
    const lowStockCount = allProducts.filter(
      (p) => p.stockQuantity > 0 && p.stockQuantity <= p.alertThreshold
    ).length;

    // Daily chart (last 14 days)
    const dailySeries: { label: string; date: string; revenue: number; orders: number }[] = [];
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const dayOrders = filteredOrders.filter(
        (o) => new Date(o.createdAt).toISOString().slice(0, 10) === iso
      );
      dailySeries.push({
        label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        date: iso,
        revenue: dayOrders.reduce((s, o) => s + parseFloat(o.totalAmount), 0),
        orders: dayOrders.length,
      });
    }

    // Monthly chart (last 6 months)
    const monthlySeries: { label: string; revenue: number; orders: number }[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mOrders = allOrders.filter(
        (o) => o.status !== 'cancelled' && new Date(o.createdAt).toISOString().slice(0, 7) === prefix
      );
      monthlySeries.push({
        label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        revenue: mOrders.reduce((s, o) => s + parseFloat(o.totalAmount), 0),
        orders: mOrders.length,
      });
    }

    // Sales by category
    const allOrderItems = await db.select().from(orderItems);
    const prodMap = new Map(allProducts.map((p) => [p.id, p]));
    const catTotals: Record<string, number> = {};
    for (const item of allOrderItems) {
      const prod = item.productId ? prodMap.get(item.productId) : null;
      const catName = prod?.categoryId ? catMap.get(prod.categoryId) || 'Autres' : 'Autres';
      catTotals[catName] = (catTotals[catName] || 0) + parseFloat(item.totalPrice);
    }
    const categoryBreakdown = Object.entries(catTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Top products
    const topProducts = [...allProducts]
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        salesCount: p.salesCount,
        stockQuantity: p.stockQuantity,
        price: parseFloat(p.price),
      }));

    const unreadNotifications = await db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(15);

    res.json({
      kpis: {
        totalRevenue,
        todaySales,
        monthSales,
        totalOrders: allOrders.length,
        pendingOrders,
        customersCount: allCustomers.length,
        productsCount: allProducts.length,
        outOfStockCount,
        lowStockCount,
      },
      charts: {
        dailySeries,
        monthlySeries,
        categoryBreakdown,
        topProducts,
      },
      notifications: unreadNotifications,
      recentOrders: allOrders.slice(0, 8),
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ error: 'Erreur lors du chargement du tableau de bord.' });
  }
});

// 2. PRODUCTS MANAGEMENT & BULK CSV
router.get('/products', async (_req, res) => {
  try {
    await ensureSeeded();
    const rows = await db.select().from(products).orderBy(desc(products.createdAt));
    const imgs = await db.select().from(productImages).orderBy(asc(productImages.displayOrder));
    const cats = await db.select().from(categories);
    const brs = await db.select().from(brands);

    const catMap = new Map(cats.map((c) => [c.id, c.name]));
    const brandMap = new Map(brs.map((b) => [b.id, b.name]));

    const items = rows.map((p) => {
      const pImgs = imgs.filter((i) => i.productId === p.id);
      return {
        ...p,
        categoryName: p.categoryId ? catMap.get(p.categoryId) || '—' : '—',
        brandName: p.brandId ? brandMap.get(p.brandId) || '—' : '—',
        images: pImgs,
        primaryImage: pImgs.find((i) => i.isPrimary)?.url || pImgs[0]?.url || '',
      };
    });
    res.json({ items });
  } catch (error) {
    console.error('Admin products list error:', error);
    res.status(500).json({ error: 'Impossible de charger les produits.' });
  }
});

router.post('/products', async (req: AuthRequest, res) => {
  try {
    const body = req.body;
    if (!body.name?.trim() || !body.sku?.trim()) {
      return res.status(400).json({ error: 'Le nom et la référence SKU sont obligatoires.' });
    }
    const slug = await uniqueProductSlug(body.slug || body.name);

    const [created] = await db
      .insert(products)
      .values({
        name: body.name.trim(),
        slug,
        sku: body.sku.trim(),
        barcode: String(body.barcode || '').trim(),
        categoryId: body.categoryId ? Number(body.categoryId) : null,
        brandId: body.brandId ? Number(body.brandId) : null,
        shortDescription: String(body.shortDescription || '').trim(),
        description: String(body.description || '').trim(),
        specifications: body.specifications || {},
        price: Number(body.price || 0).toFixed(2),
        promoPrice:
          body.promoPrice !== null && body.promoPrice !== '' && Number(body.promoPrice) > 0
            ? Number(body.promoPrice).toFixed(2)
            : null,
        costPrice: Number(body.costPrice || 0).toFixed(2),
        stockQuantity: Math.max(0, parseInt(String(body.stockQuantity || '0'), 10) || 0),
        alertThreshold: Math.max(0, parseInt(String(body.alertThreshold || '5'), 10) || 5),
        weightGrams: Math.max(0, parseInt(String(body.weightGrams || '0'), 10) || 0),
        status: body.status || 'active',
        isFeatured: Boolean(body.isFeatured),
        isBestSeller: Boolean(body.isBestSeller),
        isSample: Boolean(body.isSample),
        promoExpiresAt: body.promoExpiresAt ? new Date(body.promoExpiresAt) : null,
      })
      .returning();

    const imageUrls: string[] = Array.isArray(body.images)
      ? body.images.filter(Boolean)
      : body.imageUrl
        ? [body.imageUrl]
        : [];

    for (let i = 0; i < imageUrls.length; i += 1) {
      await db.insert(productImages).values({
        productId: created.id,
        url: imageUrls[i],
        altText: created.name,
        displayOrder: i,
        isPrimary: i === 0,
      });
    }

    if (created.stockQuantity > 0) {
      await db.insert(inventoryMovements).values({
        productId: created.id,
        movementType: 'in',
        quantityDelta: created.stockQuantity,
        previousStock: 0,
        newStock: created.stockQuantity,
        reason: 'Création produit',
        createdBy: req.authUser!.email,
      });
    }

    await logAdminAction({
      adminEmail: req.authUser!.email,
      action: 'Création produit',
      entityType: 'product',
      entityId: created.id,
      details: `${created.sku} — ${created.name}`,
    });

    res.status(201).json({ product: created });
  } catch (error: any) {
    console.error('Admin create product error:', error);
    res.status(400).json({ error: error?.message || 'Erreur lors de la création du produit.' });
  }
});

router.put('/products/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body;
    const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: 'Produit introuvable.' });

    const newStock =
      body.stockQuantity !== undefined
        ? Math.max(0, parseInt(String(body.stockQuantity), 10) || 0)
        : existing.stockQuantity;

    const [updated] = await db
      .update(products)
      .set({
        name: body.name !== undefined ? String(body.name).trim() : existing.name,
        sku: body.sku !== undefined ? String(body.sku).trim() : existing.sku,
        barcode: body.barcode !== undefined ? String(body.barcode).trim() : existing.barcode,
        categoryId: body.categoryId !== undefined ? (body.categoryId ? Number(body.categoryId) : null) : existing.categoryId,
        brandId: body.brandId !== undefined ? (body.brandId ? Number(body.brandId) : null) : existing.brandId,
        shortDescription: body.shortDescription !== undefined ? String(body.shortDescription) : existing.shortDescription,
        description: body.description !== undefined ? String(body.description) : existing.description,
        specifications: body.specifications !== undefined ? body.specifications : existing.specifications,
        price: body.price !== undefined ? Number(body.price).toFixed(2) : existing.price,
        promoPrice:
          body.promoPrice !== undefined
            ? body.promoPrice !== null && body.promoPrice !== '' && Number(body.promoPrice) > 0
              ? Number(body.promoPrice).toFixed(2)
              : null
            : existing.promoPrice,
        costPrice: body.costPrice !== undefined ? Number(body.costPrice).toFixed(2) : existing.costPrice,
        stockQuantity: newStock,
        alertThreshold:
          body.alertThreshold !== undefined
            ? Math.max(0, parseInt(String(body.alertThreshold), 10) || 0)
            : existing.alertThreshold,
        weightGrams:
          body.weightGrams !== undefined
            ? Math.max(0, parseInt(String(body.weightGrams), 10) || 0)
            : existing.weightGrams,
        status: body.status !== undefined ? body.status : existing.status,
        isFeatured: body.isFeatured !== undefined ? Boolean(body.isFeatured) : existing.isFeatured,
        isBestSeller: body.isBestSeller !== undefined ? Boolean(body.isBestSeller) : existing.isBestSeller,
        isSample: body.isSample !== undefined ? Boolean(body.isSample) : existing.isSample,
        promoExpiresAt:
          body.promoExpiresAt !== undefined
            ? body.promoExpiresAt
              ? new Date(body.promoExpiresAt)
              : null
            : existing.promoExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    if (Array.isArray(body.images)) {
      await db.delete(productImages).where(eq(productImages.productId, id));
      for (let i = 0; i < body.images.length; i += 1) {
        if (!body.images[i]) continue;
        await db.insert(productImages).values({
          productId: id,
          url: body.images[i],
          altText: updated.name,
          displayOrder: i,
          isPrimary: i === 0,
        });
      }
    }

    if (newStock !== existing.stockQuantity) {
      await db.insert(inventoryMovements).values({
        productId: id,
        movementType: 'adjustment',
        quantityDelta: newStock - existing.stockQuantity,
        previousStock: existing.stockQuantity,
        newStock,
        reason: 'Mise à jour fiche produit',
        createdBy: req.authUser!.email,
      });
    }

    await logAdminAction({
      adminEmail: req.authUser!.email,
      action: 'Modification produit',
      entityType: 'product',
      entityId: id,
      details: updated.name,
    });

    res.json({ product: updated });
  } catch (error: any) {
    console.error('Update product error:', error);
    res.status(400).json({ error: error?.message || 'Erreur lors de la modification du produit.' });
  }
});

router.post('/products/:id/duplicate', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const [orig] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!orig) return res.status(404).json({ error: 'Produit introuvable.' });

    const newSku = `${orig.sku}-COPIE-${Math.floor(100 + Math.random() * 900)}`;
    const newSlug = await uniqueProductSlug(`${orig.name}-copie`);
    const [copy] = await db
      .insert(products)
      .values({
        name: `${orig.name} (Copie)`,
        slug: newSlug,
        sku: newSku,
        barcode: '',
        categoryId: orig.categoryId,
        brandId: orig.brandId,
        shortDescription: orig.shortDescription,
        description: orig.description,
        specifications: orig.specifications,
        price: orig.price,
        promoPrice: orig.promoPrice,
        costPrice: orig.costPrice,
        stockQuantity: orig.stockQuantity,
        alertThreshold: orig.alertThreshold,
        weightGrams: orig.weightGrams,
        status: 'draft',
        isFeatured: false,
        isBestSeller: false,
        isSample: orig.isSample,
      })
      .returning();

    const imgs = await db.select().from(productImages).where(eq(productImages.productId, orig.id));
    for (const img of imgs) {
      await db.insert(productImages).values({
        productId: copy.id,
        url: img.url,
        altText: copy.name,
        displayOrder: img.displayOrder,
        isPrimary: img.isPrimary,
      });
    }

    res.status(201).json({ product: copy });
  } catch (error) {
    console.error('Duplicate product error:', error);
    res.status(500).json({ error: 'Impossible de dupliquer le produit.' });
  }
});

router.delete('/products/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(products).where(eq(products.id, id));
    await logAdminAction({
      adminEmail: req.authUser!.email,
      action: 'Suppression produit',
      entityType: 'product',
      entityId: id,
    });
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Impossible de supprimer le produit.' });
  }
});

router.post('/products/bulk-import', async (req: AuthRequest, res) => {
  try {
    const csvText = String(req.body.csv || '');
    const parsed = parseProductsCsv(csvText);
    if (parsed.length === 0) {
      return res.status(400).json({ error: 'Aucune ligne produit valide détectée dans le fichier CSV.' });
    }

    const cats = await db.select().from(categories);
    const brs = await db.select().from(brands);
    const catBySlug = new Map(cats.map((c) => [c.slug, c.id]));
    const brandBySlug = new Map(brs.map((b) => [b.slug, b.id]));

    let importedCount = 0;
    for (const item of parsed) {
      const existing = await db.select().from(products).where(eq(products.sku, item.sku)).limit(1);
      if (existing[0]) {
        await db
          .update(products)
          .set({
            name: item.name,
            price: item.price.toFixed(2),
            promoPrice: item.promoPrice ? item.promoPrice.toFixed(2) : null,
            stockQuantity: item.stockQuantity,
            shortDescription: item.shortDescription || existing[0].shortDescription,
            updatedAt: new Date(),
          })
          .where(eq(products.id, existing[0].id));
      } else {
        const slug = await uniqueProductSlug(item.name);
        await db.insert(products).values({
          name: item.name,
          slug,
          sku: item.sku,
          categoryId: catBySlug.get(item.categorySlug) ?? null,
          brandId: brandBySlug.get(item.brandSlug) ?? null,
          shortDescription: item.shortDescription,
          price: item.price.toFixed(2),
          promoPrice: item.promoPrice ? item.promoPrice.toFixed(2) : null,
          stockQuantity: item.stockQuantity,
          status: 'active',
        });
      }
      importedCount += 1;
    }

    await logAdminAction({
      adminEmail: req.authUser!.email,
      action: 'Import en masse CSV',
      entityType: 'product',
      details: `${importedCount} produit(s) importé(s)/mis à jour`,
    });

    res.json({ importedCount });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Erreur lors de l’importation CSV.' });
  }
});

router.post('/products/bulk-update', async (req: AuthRequest, res) => {
  try {
    const { productIds, pricePercentChange, setStockDelta } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'Sélectionnez au moins un produit.' });
    }
    const ids = productIds.map(Number);
    const selected = await db.select().from(products).where(inArray(products.id, ids));

    for (const p of selected) {
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (pricePercentChange !== undefined && Number(pricePercentChange) !== 0) {
        const factor = 1 + Number(pricePercentChange) / 100;
        updates.price = Math.max(0, parseFloat(p.price) * factor).toFixed(2);
      }
      if (setStockDelta !== undefined && Number(setStockDelta) !== 0) {
        const nextStock = Math.max(0, p.stockQuantity + Number(setStockDelta));
        updates.stockQuantity = nextStock;
      }
      await db.update(products).set(updates).where(eq(products.id, p.id));
    }

    await logAdminAction({
      adminEmail: req.authUser!.email,
      action: 'Mise à jour en masse',
      entityType: 'product',
      details: `${selected.length} produit(s) mis à jour`,
    });

    res.json({ updatedCount: selected.length });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour en masse.' });
  }
});

router.get('/products/export', async (_req, res) => {
  try {
    const allProds = await db.select().from(products).orderBy(asc(products.id));
    const cats = await db.select().from(categories);
    const brs = await db.select().from(brands);
    const catSlugMap = new Map(cats.map((c) => [c.id, c.slug]));
    const brandSlugMap = new Map(brs.map((b) => [b.id, b.slug]));

    const header = 'sku;nom;prix;prix_promo;stock;categorie;marque;description\n';
    const rows = allProds
      .map((p) =>
        [
          p.sku,
          `"${p.name.replace(/"/g, '""')}"`,
          p.price,
          p.promoPrice || '',
          p.stockQuantity,
          p.categoryId ? catSlugMap.get(p.categoryId) || '' : '',
          p.brandId ? brandSlugMap.get(p.brandId) || '' : '',
          `"${p.shortDescription.replace(/"/g, '""')}"`,
        ].join(';')
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="catalogue-librairie-amine.csv"');
    res.send('\uFEFF' + header + rows);
  } catch (error) {
    console.error('Export products error:', error);
    res.status(500).json({ error: 'Erreur lors de l’exportation.' });
  }
});

// 3. CATEGORIES & BRANDS
router.get('/categories', async (_req, res) => {
  const rows = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.displayOrder), asc(categories.id));
  res.json({ items: rows });
});

router.post('/categories', async (req: AuthRequest, res) => {
  try {
    const { name, description, imageUrl, parentId, displayOrder, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Le nom est requis.' });
    const slug = slugify(name) + '-' + Math.floor(100 + Math.random() * 900);
    const cleanSlugBase = slugify(name);
    const existing = await db.select().from(categories).where(eq(categories.slug, cleanSlugBase)).limit(1);

    const [created] = await db
      .insert(categories)
      .values({
        name: name.trim(),
        slug: existing[0] ? slug : cleanSlugBase,
        description: (description || '').trim(),
        imageUrl: (imageUrl || '').trim(),
        parentId: parentId ? Number(parentId) : null,
        displayOrder: Number(displayOrder || 0),
        isActive: isActive !== false,
      })
      .returning();

    res.status(201).json({ category: created });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(400).json({ error: 'Impossible de créer la catégorie.' });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description, imageUrl, parentId, displayOrder, isActive } = req.body;
    const [updated] = await db
      .update(categories)
      .set({
        name: name?.trim(),
        description: description ?? '',
        imageUrl: imageUrl ?? '',
        parentId: parentId ? Number(parentId) : null,
        displayOrder: Number(displayOrder ?? 0),
        isActive: Boolean(isActive),
      })
      .where(eq(categories.id, id))
      .returning();
    res.json({ category: updated });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(400).json({ error: 'Impossible de modifier la catégorie.' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  await db.delete(categories).where(eq(categories.id, Number(req.params.id)));
  res.json({ ok: true });
});

router.get('/brands', async (_req, res) => {
  const rows = await db.select().from(brands).orderBy(asc(brands.name));
  res.json({ items: rows });
});

router.post('/brands', async (req, res) => {
  try {
    const { name, description, logoUrl } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Le nom est requis.' });
    const [created] = await db
      .insert(brands)
      .values({
        name: name.trim(),
        slug: slugify(name),
        description: (description || '').trim(),
        logoUrl: (logoUrl || '').trim(),
      })
      .returning();
    res.status(201).json({ brand: created });
  } catch (error) {
    console.error('Create brand error:', error);
    res.status(400).json({ error: 'Impossible de créer la marque.' });
  }
});

router.put('/brands/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, description, logoUrl, isActive } = req.body;
  const [updated] = await db
    .update(brands)
    .set({
      name: name?.trim(),
      description: description ?? '',
      logoUrl: logoUrl ?? '',
      isActive: isActive !== false,
    })
    .where(eq(brands.id, id))
    .returning();
  res.json({ brand: updated });
});

router.delete('/brands/:id', async (req, res) => {
  await db.delete(brands).where(eq(brands.id, Number(req.params.id)));
  res.json({ ok: true });
});

// 4. ORDERS & INVOICES
router.get('/orders', async (req, res) => {
  try {
    await ensureSeeded();
    const statusFilter = String(req.query.status || '').trim();
    const search = String(req.query.search || '').trim().toLowerCase();

    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const allItems = await db.select().from(orderItems);
    const allPayments = await db.select().from(payments);
    const allDeliveries = await db.select().from(deliveries);

    let enriched = allOrders.map((o) => ({
      ...o,
      items: allItems.filter((i) => i.orderId === o.id),
      payments: allPayments.filter((p) => p.orderId === o.id),
      delivery: allDeliveries.find((d) => d.orderId === o.id) || null,
    }));

    if (statusFilter && statusFilter !== 'all') {
      enriched = enriched.filter((o) => o.status === statusFilter);
    }
    if (search) {
      enriched = enriched.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(search) ||
          o.customerName.toLowerCase().includes(search) ||
          o.customerPhone.toLowerCase().includes(search)
      );
    }

    res.json({ items: enriched });
  } catch (error) {
    console.error('Admin orders error:', error);
    res.status(500).json({ error: 'Impossible de charger les commandes.' });
  }
});

router.put('/orders/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { status, paymentStatus, internalNotes, trackingCode } = req.body;

    const updated = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(orders).where(eq(orders.id, id)).limit(1);
      if (!existing) throw new Error('Commande introuvable.');

      let nextStockDeducted = existing.stockDeducted;
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, id));

      // If transitioning to cancelled and stock was deducted, restore stock safely
      if (status === 'cancelled' && existing.status !== 'cancelled' && existing.stockDeducted) {
        for (const item of items) {
          if (!item.productId) continue;
          const [prod] = await tx
            .select()
            .from(products)
            .where(eq(products.id, item.productId))
            .limit(1);
          if (prod) {
            const newStock = prod.stockQuantity + item.quantity;
            await tx
              .update(products)
              .set({ stockQuantity: newStock, updatedAt: new Date() })
              .where(eq(products.id, prod.id));
            await tx.insert(inventoryMovements).values({
              productId: prod.id,
              movementType: 'return',
              quantityDelta: item.quantity,
              previousStock: prod.stockQuantity,
              newStock,
              reason: `Annulation commande ${existing.orderNumber}`,
              createdBy: req.authUser!.email,
            });
          }
        }
        nextStockDeducted = false;
      }

      const [order] = await tx
        .update(orders)
        .set({
          status: status || existing.status,
          paymentStatus: paymentStatus || existing.paymentStatus,
          internalNotes: internalNotes !== undefined ? internalNotes : existing.internalNotes,
          stockDeducted: nextStockDeducted,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id))
        .returning();

      if (status) {
        await tx
          .update(deliveries)
          .set({
            status: status === 'delivered' ? 'delivered' : status === 'shipped' ? 'in_transit' : status,
            trackingCode: trackingCode !== undefined ? trackingCode : undefined,
            deliveredAt: status === 'delivered' ? new Date() : undefined,
            updatedAt: new Date(),
          })
          .where(eq(deliveries.orderId, id));
      }

      if (paymentStatus) {
        await tx
          .update(payments)
          .set({ status: paymentStatus })
          .where(eq(payments.orderId, id));
      }

      return order;
    });

    await logAdminAction({
      adminEmail: req.authUser!.email,
      action: 'Mise à jour commande',
      entityType: 'order',
      entityId: updated.orderNumber,
      details: `Statut: ${updated.status} · Paiement: ${updated.paymentStatus}`,
    });

    res.json({ order: updated });
  } catch (error: any) {
    console.error('Update order error:', error);
    res.status(400).json({ error: error?.message || 'Impossible de mettre à jour la commande.' });
  }
});

router.get('/orders/export', async (_req, res) => {
  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const header = 'numero;client;telephone;ville;mode_livraison;paiement;statut_paiement;statut;total_dh;date\n';
  const rows = allOrders
    .map((o) =>
      [
        o.orderNumber,
        `"${o.customerName.replace(/"/g, '""')}"`,
        o.customerPhone,
        o.city,
        `"${o.deliveryMethod}"`,
        o.paymentMethod,
        o.paymentStatus,
        o.status,
        o.totalAmount,
        new Date(o.createdAt).toLocaleDateString('fr-FR'),
      ].join(';')
    )
    .join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="commandes-librairie-amine.csv"');
  res.send('\uFEFF' + header + rows);
});

// 5. CUSTOMERS
router.get('/customers', async (_req, res) => {
  const customerUsers = await db
    .select()
    .from(users)
    .where(eq(users.role, 'customer'))
    .orderBy(desc(users.createdAt));
  const profiles = await db.select().from(customerProfiles);
  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));

  const items = customerUsers.map((u) => {
    const profile = profiles.find((p) => p.userId === u.id);
    const uOrders = allOrders.filter((o) => o.userId === u.id);
    const totalSpent = uOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((s, o) => s + parseFloat(o.totalAmount), 0);
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      isActive: u.isActive,
      createdAt: u.createdAt,
      defaultCity: profile?.defaultCity || 'Aït Melloul',
      notes: profile?.notes || '',
      ordersCount: uOrders.length,
      totalSpent,
      orders: uOrders,
    };
  });

  res.json({ items });
});

router.put('/customers/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { isActive, notes } = req.body;
  if (isActive !== undefined) {
    await db.update(users).set({ isActive: Boolean(isActive) }).where(eq(users.id, id));
  }
  if (notes !== undefined) {
    await db
      .insert(customerProfiles)
      .values({ userId: id, notes: String(notes) })
      .onConflictDoUpdate({
        target: customerProfiles.userId,
        set: { notes: String(notes), updatedAt: new Date() },
      });
  }
  res.json({ ok: true });
});

// 6. INVENTORY & SUPPLIERS
router.get('/inventory', async (_req, res) => {
  const prods = await db.select().from(products).orderBy(asc(products.stockQuantity));
  const movements = await db
    .select()
    .from(inventoryMovements)
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(100);
  const sups = await db.select().from(suppliers).orderBy(asc(suppliers.name));
  res.json({ products: prods, movements, suppliers: sups });
});

router.post('/inventory/movement', async (req: AuthRequest, res) => {
  try {
    const { productId, supplierId, movementType, quantity, reason } = req.body;
    const pid = Number(productId);
    const qty = Math.abs(parseInt(String(quantity || '0'), 10));
    if (!pid || qty <= 0) {
      return res.status(400).json({ error: 'Produit et quantité positive requis.' });
    }

    const result = await db.transaction(async (tx) => {
      const [prod] = await tx.select().from(products).where(eq(products.id, pid)).limit(1);
      if (!prod) throw new Error('Produit introuvable.');

      let delta = qty;
      if (movementType === 'out') delta = -qty;
      else if (movementType === 'adjustment') {
        delta = Number(quantity) - prod.stockQuantity;
      }

      const newStock = Math.max(0, prod.stockQuantity + delta);
      await tx
        .update(products)
        .set({ stockQuantity: newStock, updatedAt: new Date() })
        .where(eq(products.id, pid));

      const [mov] = await tx
        .insert(inventoryMovements)
        .values({
          productId: pid,
          supplierId: supplierId ? Number(supplierId) : null,
          movementType: movementType || 'in',
          quantityDelta: newStock - prod.stockQuantity,
          previousStock: prod.stockQuantity,
          newStock,
          reason: (reason || 'Mouvement manuel').trim(),
          createdBy: req.authUser!.email,
        })
        .returning();

      return { mov, newStock };
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Inventory movement error:', error);
    res.status(400).json({ error: error?.message || 'Erreur mouvement de stock.' });
  }
});

router.get('/suppliers', async (_req, res) => {
  const rows = await db.select().from(suppliers).orderBy(asc(suppliers.name));
  res.json({ items: rows });
});

router.post('/suppliers', async (req, res) => {
  const { name, contactName, phone, email, city, address, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nom fournisseur requis.' });
  const [created] = await db
    .insert(suppliers)
    .values({
      name: name.trim(),
      contactName: contactName || '',
      phone: phone || '',
      email: email || '',
      city: city || '',
      address: address || '',
      notes: notes || '',
    })
    .returning();
  res.status(201).json({ supplier: created });
});

router.delete('/suppliers/:id', async (req, res) => {
  await db.delete(suppliers).where(eq(suppliers.id, Number(req.params.id)));
  res.json({ ok: true });
});

// 7. DELIVERY ZONES
router.get('/delivery-zones', async (_req, res) => {
  const rows = await db
    .select()
    .from(deliveryZones)
    .orderBy(asc(deliveryZones.displayOrder), asc(deliveryZones.id));
  res.json({ items: rows });
});

router.post('/delivery-zones', async (req, res) => {
  const { name, city, fee, minOrderAmount, estimatedDelay, isStorePickup, isActive } = req.body;
  if (!name?.trim() || !city?.trim()) {
    return res.status(400).json({ error: 'Nom et ville obligatoires.' });
  }
  const [created] = await db
    .insert(deliveryZones)
    .values({
      name: name.trim(),
      city: city.trim(),
      fee: Number(fee || 0).toFixed(2),
      minOrderAmount: Number(minOrderAmount || 0).toFixed(2),
      estimatedDelay: (estimatedDelay || 'À confirmer').trim(),
      isStorePickup: Boolean(isStorePickup),
      isActive: isActive !== false,
      isSample: false,
    })
    .returning();
  res.status(201).json({ zone: created });
});

router.put('/delivery-zones/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, city, fee, minOrderAmount, estimatedDelay, isStorePickup, isActive } = req.body;
  const [updated] = await db
    .update(deliveryZones)
    .set({
      name: name?.trim(),
      city: city?.trim(),
      fee: Number(fee || 0).toFixed(2),
      minOrderAmount: Number(minOrderAmount || 0).toFixed(2),
      estimatedDelay: (estimatedDelay || '').trim(),
      isStorePickup: Boolean(isStorePickup),
      isActive: Boolean(isActive),
      isSample: false,
    })
    .where(eq(deliveryZones.id, id))
    .returning();
  res.json({ zone: updated });
});

router.delete('/delivery-zones/:id', async (req, res) => {
  await db.delete(deliveryZones).where(eq(deliveryZones.id, Number(req.params.id)));
  res.json({ ok: true });
});

// 8. PAYMENTS
router.get('/payments', async (_req, res) => {
  const allPayments = await db.select().from(payments).orderBy(desc(payments.createdAt));
  const allOrders = await db.select().from(orders);
  const orderMap = new Map(allOrders.map((o) => [o.id, o]));
  const items = allPayments.map((p) => {
    const o = orderMap.get(p.orderId);
    return {
      ...p,
      orderNumber: o?.orderNumber || '—',
      customerName: o?.customerName || '—',
    };
  });
  res.json({ items });
});

router.post('/payments/manual', async (req: AuthRequest, res) => {
  try {
    const { orderId, method, amount, status, reference, notes } = req.body;
    const oid = Number(orderId);
    const [order] = await db.select().from(orders).where(eq(orders.id, oid)).limit(1);
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });

    const [created] = await db
      .insert(payments)
      .values({
        orderId: oid,
        method: method || order.paymentMethod,
        provider: 'Enregistrement manuel',
        amount: Number(amount || order.totalAmount).toFixed(2),
        status: status || 'paid',
        reference: (reference || '').trim(),
        notes: (notes || '').trim(),
      })
      .returning();

    await db
      .update(orders)
      .set({ paymentStatus: status || 'paid', updatedAt: new Date() })
      .where(eq(orders.id, oid));

    await logAdminAction({
      adminEmail: req.authUser!.email,
      action: 'Paiement manuel / Remboursement',
      entityType: 'payment',
      entityId: order.orderNumber,
      details: `${created.amount} DH (${created.status})`,
    });

    res.status(201).json({ payment: created });
  } catch (error) {
    console.error('Manual payment error:', error);
    res.status(400).json({ error: 'Impossible d’enregistrer le paiement.' });
  }
});

// 9. COUPONS & NEWSLETTERS
router.get('/marketing', async (_req, res) => {
  const couponRows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
  const newsletterRows = await db.select().from(newsletters).orderBy(desc(newsletters.createdAt));
  res.json({ coupons: couponRows, newsletters: newsletterRows });
});

router.post('/coupons', async (req, res) => {
  try {
    const { code, discountType, discountValue, minPurchase, maxUses, expiresAt, isActive, description } = req.body;
    if (!code?.trim()) return res.status(400).json({ error: 'Code promotionnel requis.' });

    const [created] = await db
      .insert(coupons)
      .values({
        code: code.trim().toUpperCase(),
        discountType: discountType === 'fixed' ? 'fixed' : 'percentage',
        discountValue: Number(discountValue || 0).toFixed(2),
        minPurchase: Number(minPurchase || 0).toFixed(2),
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive !== false,
        description: (description || '').trim(),
      })
      .returning();
    res.status(201).json({ coupon: created });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Impossible de créer le code.' });
  }
});

router.put('/coupons/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { isActive, discountValue, minPurchase, maxUses, expiresAt, description } = req.body;
  const [updated] = await db
    .update(coupons)
    .set({
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      discountValue: discountValue !== undefined ? Number(discountValue).toFixed(2) : undefined,
      minPurchase: minPurchase !== undefined ? Number(minPurchase).toFixed(2) : undefined,
      maxUses: maxUses !== undefined ? (maxUses ? Number(maxUses) : null) : undefined,
      expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
      description: description !== undefined ? String(description) : undefined,
    })
    .where(eq(coupons.id, id))
    .returning();
  res.json({ coupon: updated });
});

router.delete('/coupons/:id', async (req, res) => {
  await db.delete(coupons).where(eq(coupons.id, Number(req.params.id)));
  res.json({ ok: true });
});

// 10. REVIEWS & CONTACT MESSAGES
router.get('/reviews', async (_req, res) => {
  const reviewRows = await db.select().from(reviews).orderBy(desc(reviews.createdAt));
  const msgRows = await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  res.json({ reviews: reviewRows, messages: msgRows });
});

router.put('/reviews/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { isApproved, isStoreTestimonial, comment, authorName, authorRole } = req.body;
  const [updated] = await db
    .update(reviews)
    .set({
      isApproved: isApproved !== undefined ? Boolean(isApproved) : undefined,
      isStoreTestimonial: isStoreTestimonial !== undefined ? Boolean(isStoreTestimonial) : undefined,
      comment: comment !== undefined ? String(comment) : undefined,
      authorName: authorName !== undefined ? String(authorName) : undefined,
      authorRole: authorRole !== undefined ? String(authorRole) : undefined,
      isSample: false,
    })
    .where(eq(reviews.id, id))
    .returning();
  res.json({ review: updated });
});

router.delete('/reviews/:id', async (req, res) => {
  await db.delete(reviews).where(eq(reviews.id, Number(req.params.id)));
  res.json({ ok: true });
});

// 11. REPORTS
router.get('/reports', async (req, res) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;

    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const filteredOrders = allOrders.filter((o) => {
      const d = new Date(o.createdAt);
      if (from && !Number.isNaN(from.getTime()) && d < from) return false;
      if (to && !Number.isNaN(to.getTime())) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });

    const validOrders = filteredOrders.filter((o) => o.status !== 'cancelled');
    const revenue = validOrders.reduce((s, o) => s + parseFloat(o.totalAmount), 0);
    const discounts = validOrders.reduce((s, o) => s + parseFloat(o.discountAmount), 0);
    const deliveryFees = validOrders.reduce((s, o) => s + parseFloat(o.deliveryFee), 0);

    const allProds = await db.select().from(products);
    const stockValuation = allProds.reduce(
      (s, p) => s + p.stockQuantity * parseFloat(p.costPrice || p.price),
      0
    );

    const paymentRows = await db.select().from(payments);
    const couponRows = await db.select().from(coupons);
    const customerRows = await db.select().from(users).where(eq(users.role, 'customer'));

    res.json({
      summary: {
        ordersTotal: filteredOrders.length,
        ordersCompleted: validOrders.length,
        ordersCancelled: filteredOrders.length - validOrders.length,
        revenue,
        discounts,
        deliveryFees,
        averageBasket: validOrders.length > 0 ? revenue / validOrders.length : 0,
        stockValuation,
        totalProducts: allProds.length,
        totalCustomers: customerRows.length,
      },
      orders: filteredOrders,
      products: allProds,
      coupons: couponRows,
      payments: paymentRows,
    });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ error: 'Impossible de générer les rapports.' });
  }
});

// 12. SETTINGS, IMAGE UPLOAD & SECURITY
router.get('/settings', async (_req, res) => {
  await ensureSeeded();
  const rows = await db.select().from(storeSettings);
  const map: Record<string, Record<string, unknown>> = { ...DEFAULT_STORE_SETTINGS };
  for (const r of rows) map[r.key] = r.value;
  res.json({ settings: map });
});

router.put('/settings/:key', async (req: AuthRequest, res) => {
  try {
    const key = String(req.params.key);
    const value = req.body.value || req.body;
    await db
      .insert(storeSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: storeSettings.key,
        set: { value, updatedAt: new Date() },
      });

    await logAdminAction({
      adminEmail: req.authUser!.email,
      action: 'Modification paramètres',
      entityType: 'settings',
      entityId: key,
    });

    res.json({ ok: true, key, value });
  } catch (error) {
    console.error('Save settings error:', error);
    res.status(500).json({ error: 'Impossible d’enregistrer les paramètres.' });
  }
});

router.post('/upload', async (req, res) => {
  try {
    const { dataUrl, filename } = req.body;
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Format image invalide.' });
    }
    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Image encodée invalide.' });
    }
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1].replace(/[^a-z0-9]/gi, '');
    const buffer = Buffer.from(matches[2], 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'L’image dépasse la limite de 5 Mo.' });
    }

    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const safeName = `${slugify(filename || 'image')}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(uploadsDir, safeName), buffer);

    res.json({ url: `/uploads/${safeName}` });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Échec du téléversement.' });
  }
});

router.get('/security', async (_req, res) => {
  const logs = await db
    .select()
    .from(adminActivityLogs)
    .orderBy(desc(adminActivityLogs.createdAt))
    .limit(50);
  const admins = await db.select().from(users).where(eq(users.role, 'admin'));
  res.json({
    logs,
    admins: admins.map((a) => ({
      id: a.id,
      email: a.email,
      fullName: a.fullName,
      isActive: a.isActive,
      createdAt: a.createdAt,
    })),
  });
});

router.post('/security/admin-users', async (req: AuthRequest, res) => {
  try {
    const { email, fullName, password } = req.body;
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized || !password || String(password).length < 8) {
      return res.status(400).json({
        error: 'E-mail valide et mot de passe de 8 caractères minimum requis.',
      });
    }
    const hash = await hashPassword(String(password));
    const [created] = await db
      .insert(users)
      .values({
        uid: `local-${crypto.randomUUID()}`,
        email: normalized,
        passwordHash: hash,
        fullName: (fullName || 'Administrateur').trim(),
        role: 'admin',
      })
      .onConflictDoUpdate({
        target: users.email,
        set: { role: 'admin', passwordHash: hash, updatedAt: new Date() },
      })
      .returning();

    await logAdminAction({
      adminEmail: req.authUser!.email,
      action: 'Création administrateur',
      entityType: 'user',
      entityId: created.email,
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Create admin user error:', error);
    res.status(400).json({ error: 'Impossible de créer l’administrateur.' });
  }
});

router.post('/notifications/read-all', async (_req, res) => {
  await db.update(notifications).set({ isRead: true });
  res.json({ ok: true });
});

router.get('/backup', async (_req, res) => {
  const [cats, brs, prods, ords, custs, settings, zones, coups] = await Promise.all([
    db.select().from(categories),
    db.select().from(brands),
    db.select().from(products),
    db.select().from(orders),
    db.select().from(users),
    db.select().from(storeSettings),
    db.select().from(deliveryZones),
    db.select().from(coupons),
  ]);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="sauvegarde-librairie-amine-${new Date().toISOString().slice(0, 10)}.json"`
  );
  res.send(
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        categories: cats,
        brands: brs,
        products: prods,
        orders: ords,
        usersCount: custs.length,
        storeSettings: settings,
        deliveryZones: zones,
        coupons: coups,
      },
      null,
      2
    )
  );
});

export default router;
