import { Router } from 'express';
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
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
} from '../../db/schema.ts';
import {
  calculateOrderTotals,
  computeDiscountPercent,
  generateOrderNumber,
  roundMoney,
} from '../../lib/commerce.ts';
import { AuthRequest, optionalAuth } from '../auth.ts';
import { DEFAULT_STORE_SETTINGS, ensureSeeded } from '../seed.ts';

const router = Router();

async function getAllSettingsMap(): Promise<Record<string, Record<string, unknown>>> {
  const rows = await db.select().from(storeSettings);
  const map: Record<string, Record<string, unknown>> = { ...DEFAULT_STORE_SETTINGS };
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

router.get('/storefront', async (_req, res) => {
  try {
    await ensureSeeded();
    const settings = await getAllSettingsMap();

    const activeCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.displayOrder), asc(categories.id));

    const activeBrands = await db
      .select()
      .from(brands)
      .where(eq(brands.isActive, true))
      .orderBy(asc(brands.name));

    const zones = await db
      .select()
      .from(deliveryZones)
      .where(eq(deliveryZones.isActive, true))
      .orderBy(asc(deliveryZones.displayOrder), asc(deliveryZones.id));

    const testimonials = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.isApproved, true), eq(reviews.isStoreTestimonial, true)))
      .orderBy(desc(reviews.createdAt))
      .limit(6);

    // Strip any sensitive gateway credential fields from public response
    const safePayment = {
      ...(settings.payment || {}),
      onlineMerchantId: settings.payment?.onlineMerchantId ? 'configured' : '',
    };

    res.json({
      settings: {
        ...settings,
        payment: safePayment,
      },
      categories: activeCategories,
      brands: activeBrands,
      deliveryZones: zones,
      testimonials,
      googleMapsApiKey:
        process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
    });
  } catch (error) {
    console.error('Error loading storefront:', error);
    res.status(500).json({ error: 'Impossible de charger les données de la boutique.' });
  }
});

router.get('/products', async (req, res) => {
  try {
    await ensureSeeded();
    const search = String(req.query.search || '').trim();
    const categorySlug = String(req.query.category || '').trim();
    const brandSlug = String(req.query.brand || '').trim();
    const minPrice = req.query.minPrice ? parseFloat(String(req.query.minPrice)) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(String(req.query.maxPrice)) : null;
    const inStockOnly = req.query.inStock === 'true';
    const promoOnly = req.query.promo === 'true';
    const featuredOnly = req.query.featured === 'true';
    const bestSellerOnly = req.query.bestSeller === 'true';
    const sort = String(req.query.sort || 'newest');
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(60, Math.max(1, parseInt(String(req.query.limit || '12'), 10) || 12));

    const allCats = await db.select().from(categories);
    const allBrands = await db.select().from(brands);
    const catMap = new Map(allCats.map((c) => [c.id, c]));
    const brandMap = new Map(allBrands.map((b) => [b.id, b]));

    const conditions = [eq(products.status, 'active')];

    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.shortDescription, `%${search}%`),
          ilike(products.sku, `%${search}%`)
        )!
      );
    }

    if (categorySlug && categorySlug !== 'promotions') {
      const matchedCat = allCats.find((c) => c.slug === categorySlug);
      if (matchedCat) {
        const subIds = allCats
          .filter((c) => c.parentId === matchedCat.id)
          .map((c) => c.id);
        conditions.push(inArray(products.categoryId, [matchedCat.id, ...subIds]));
      }
    }

    if (brandSlug) {
      const matchedBrand = allBrands.find((b) => b.slug === brandSlug);
      if (matchedBrand) {
        conditions.push(eq(products.brandId, matchedBrand.id));
      }
    }

    if (featuredOnly) conditions.push(eq(products.isFeatured, true));
    if (bestSellerOnly) conditions.push(eq(products.isBestSeller, true));
    if (inStockOnly) conditions.push(sql`${products.stockQuantity} > 0`);

    const rawProducts = await db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(desc(products.createdAt));

    const productIds = rawProducts.map((p) => p.id);
    const images =
      productIds.length > 0
        ? await db
            .select()
            .from(productImages)
            .where(inArray(productImages.productId, productIds))
            .orderBy(asc(productImages.displayOrder))
        : [];

    const imagesByProduct = new Map<number, typeof images>();
    for (const img of images) {
      const list = imagesByProduct.get(img.productId) || [];
      list.push(img);
      imagesByProduct.set(img.productId, list);
    }

    let enriched = rawProducts.map((p) => {
      const priceNum = parseFloat(p.price);
      const promoNum = p.promoPrice ? parseFloat(p.promoPrice) : null;
      const effectivePrice =
        promoNum !== null && promoNum > 0 && promoNum < priceNum ? promoNum : priceNum;
      const discountPercent = computeDiscountPercent(priceNum, promoNum);
      const imgs = imagesByProduct.get(p.id) || [];
      const cat = p.categoryId ? catMap.get(p.categoryId) || null : null;
      const brand = p.brandId ? brandMap.get(p.brandId) || null : null;

      return {
        ...p,
        priceNum,
        promoPriceNum: promoNum,
        effectivePrice,
        discountPercent,
        category: cat ? { id: cat.id, name: cat.name, slug: cat.slug } : null,
        brand: brand ? { id: brand.id, name: brand.name, slug: brand.slug } : null,
        images: imgs,
        primaryImage: imgs.find((i) => i.isPrimary)?.url || imgs[0]?.url || '',
      };
    });

    if (promoOnly || categorySlug === 'promotions') {
      enriched = enriched.filter((p) => p.discountPercent > 0);
    }
    if (minPrice !== null && Number.isFinite(minPrice)) {
      enriched = enriched.filter((p) => p.effectivePrice >= minPrice);
    }
    if (maxPrice !== null && Number.isFinite(maxPrice)) {
      enriched = enriched.filter((p) => p.effectivePrice <= maxPrice);
    }

    if (sort === 'price_asc') {
      enriched.sort((a, b) => a.effectivePrice - b.effectivePrice);
    } else if (sort === 'price_desc') {
      enriched.sort((a, b) => b.effectivePrice - a.effectivePrice);
    } else if (sort === 'popular') {
      enriched.sort((a, b) => b.salesCount - a.salesCount);
    } else if (sort === 'discount') {
      enriched.sort((a, b) => b.discountPercent - a.discountPercent);
    } else {
      enriched.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    const total = enriched.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const paginated = enriched.slice(offset, offset + limit);

    res.json({
      items: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error listing products:', error);
    res.status(500).json({ error: 'Impossible de charger les produits.' });
  }
});

router.get('/products/:slug', async (req, res) => {
  try {
    await ensureSeeded();
    const { slug } = req.params;
    const found = await db
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), eq(products.status, 'active')))
      .limit(1);

    const product = found[0];
    if (!product) {
      return res.status(404).json({ error: 'Produit introuvable.' });
    }

    const imgs = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(asc(productImages.displayOrder));

    const cat = product.categoryId
      ? (await db.select().from(categories).where(eq(categories.id, product.categoryId)).limit(1))[0] || null
      : null;

    const brand = product.brandId
      ? (await db.select().from(brands).where(eq(brands.id, product.brandId)).limit(1))[0] || null
      : null;

    const productReviews = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.productId, product.id), eq(reviews.isApproved, true)))
      .orderBy(desc(reviews.createdAt));

    const relatedRaw = product.categoryId
      ? await db
          .select()
          .from(products)
          .where(
            and(
              eq(products.categoryId, product.categoryId),
              eq(products.status, 'active'),
              sql`${products.id} != ${product.id}`
            )
          )
          .limit(4)
      : [];

    const relatedIds = relatedRaw.map((r) => r.id);
    const relatedImgs =
      relatedIds.length > 0
        ? await db
            .select()
            .from(productImages)
            .where(inArray(productImages.productId, relatedIds))
            .orderBy(asc(productImages.displayOrder))
        : [];

    const related = relatedRaw.map((r) => {
      const priceNum = parseFloat(r.price);
      const promoNum = r.promoPrice ? parseFloat(r.promoPrice) : null;
      const rImgs = relatedImgs.filter((i) => i.productId === r.id);
      return {
        ...r,
        priceNum,
        promoPriceNum: promoNum,
        effectivePrice: promoNum && promoNum < priceNum ? promoNum : priceNum,
        discountPercent: computeDiscountPercent(priceNum, promoNum),
        primaryImage: rImgs.find((i) => i.isPrimary)?.url || rImgs[0]?.url || '',
      };
    });

    const priceNum = parseFloat(product.price);
    const promoNum = product.promoPrice ? parseFloat(product.promoPrice) : null;

    res.json({
      product: {
        ...product,
        priceNum,
        promoPriceNum: promoNum,
        effectivePrice: promoNum && promoNum < priceNum ? promoNum : priceNum,
        discountPercent: computeDiscountPercent(priceNum, promoNum),
        category: cat,
        brand,
        images: imgs,
        primaryImage: imgs.find((i) => i.isPrimary)?.url || imgs[0]?.url || '',
      },
      reviews: productReviews,
      related,
    });
  } catch (error) {
    console.error('Error loading product details:', error);
    res.status(500).json({ error: 'Impossible de charger la fiche produit.' });
  }
});

router.post('/coupons/validate', async (req, res) => {
  try {
    await ensureSeeded();
    const code = String(req.body.code || '').trim().toUpperCase();
    const subtotal = Number(req.body.subtotal || 0);

    if (!code) {
      return res.status(400).json({ error: 'Veuillez saisir un code promotionnel.' });
    }

    const found = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, code))
      .limit(1);

    const coupon = found[0];
    if (!coupon) {
      return res.status(404).json({ error: 'Code promotionnel introuvable.' });
    }

    const totals = calculateOrderTotals({
      items: [{ unitPrice: subtotal, quantity: 1 }],
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType === 'fixed' ? 'fixed' : 'percentage',
        discountValue: parseFloat(coupon.discountValue),
        minPurchase: parseFloat(coupon.minPurchase),
        maxUses: coupon.maxUses,
        usedCount: coupon.usedCount,
        expiresAt: coupon.expiresAt,
        isActive: coupon.isActive,
      },
      baseDeliveryFee: 0,
    });

    if (totals.couponError) {
      return res.status(400).json({ error: totals.couponError });
    }

    res.json({
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: parseFloat(coupon.discountValue),
        description: coupon.description,
      },
      discountAmount: totals.discountAmount,
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification du code promotionnel.' });
  }
});

router.post('/orders', optionalAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const {
      customerName,
      customerPhone,
      customerEmail,
      city,
      address,
      instructions,
      deliveryZoneId,
      paymentMethod,
      couponCode,
      items,
    } = req.body;

    if (!customerName?.trim() || !customerPhone?.trim()) {
      return res.status(400).json({
        error: 'Veuillez renseigner votre nom complet et votre numéro de téléphone.',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Votre panier est vide.' });
    }

    const settings = await getAllSettingsMap();
    const paymentSettings = settings.payment || {};
    const deliverySettings = settings.delivery || {};
    const taxSettings = settings.tax || {};

    if (paymentMethod === 'cod' && paymentSettings.codEnabled === false) {
      return res.status(400).json({ error: 'Le paiement à la livraison est désactivé.' });
    }
    if (paymentMethod === 'online' && paymentSettings.onlineEnabled !== true) {
      return res.status(400).json({
        error: 'Le paiement en ligne n’est pas encore activé dans les paramètres de la boutique.',
      });
    }
    if (paymentMethod === 'bank_transfer' && paymentSettings.bankTransferEnabled === false) {
      return res.status(400).json({ error: 'Le virement bancaire est désactivé.' });
    }

    const zoneRows = deliveryZoneId
      ? await db
          .select()
          .from(deliveryZones)
          .where(and(eq(deliveryZones.id, Number(deliveryZoneId)), eq(deliveryZones.isActive, true)))
          .limit(1)
      : [];
    const zone = zoneRows[0];

    if (!zone) {
      return res.status(400).json({ error: 'Veuillez sélectionner un mode de livraison valide.' });
    }

    if (!zone.isStorePickup && (!city?.trim() || !address?.trim())) {
      return res.status(400).json({
        error: 'Veuillez renseigner votre ville et votre adresse complète pour la livraison.',
      });
    }

    const createdOrder = await db.transaction(async (tx) => {
      const requestedIds = items.map((i: { productId: number }) => Number(i.productId));
      const dbProducts = await tx
        .select()
        .from(products)
        .where(inArray(products.id, requestedIds));
      const prodMap = new Map(dbProducts.map((p) => [p.id, p]));

      const resolvedItems: {
        product: typeof dbProducts[number];
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }[] = [];

      for (const reqItem of items) {
        const pid = Number(reqItem.productId);
        const qty = Number(reqItem.quantity);
        const prod = prodMap.get(pid);
        if (!prod || prod.status !== 'active') {
          throw new Error(`Produit introuvable ou indisponible (ID ${pid}).`);
        }
        if (!Number.isInteger(qty) || qty <= 0) {
          throw new Error(`Quantité invalide pour "${prod.name}".`);
        }
        if (qty > prod.stockQuantity) {
          throw new Error(
            `Stock insuffisant pour "${prod.name}" (stock disponible : ${prod.stockQuantity}).`
          );
        }

        const priceNum = parseFloat(prod.price);
        const promoNum = prod.promoPrice ? parseFloat(prod.promoPrice) : null;
        const unitPrice =
          promoNum !== null && promoNum > 0 && promoNum < priceNum ? promoNum : priceNum;

        resolvedItems.push({
          product: prod,
          quantity: qty,
          unitPrice,
          totalPrice: roundMoney(unitPrice * qty),
        });
      }

      let couponRecord: typeof coupons.$inferSelect | null = null;
      if (couponCode && String(couponCode).trim()) {
        const cRows = await tx
          .select()
          .from(coupons)
          .where(eq(coupons.code, String(couponCode).trim().toUpperCase()))
          .limit(1);
        couponRecord = cRows[0] || null;
      }

      const freeThreshold =
        deliverySettings.freeDeliveryThreshold !== null &&
        deliverySettings.freeDeliveryThreshold !== undefined &&
        Number(deliverySettings.freeDeliveryThreshold) > 0
          ? Number(deliverySettings.freeDeliveryThreshold)
          : null;

      const taxRate =
        taxSettings.enabled === true && Number(taxSettings.ratePercent) > 0
          ? Number(taxSettings.ratePercent)
          : 0;

      const totals = calculateOrderTotals({
        items: resolvedItems.map((i) => ({ unitPrice: i.unitPrice, quantity: i.quantity })),
        coupon: couponRecord
          ? {
              code: couponRecord.code,
              discountType:
                couponRecord.discountType === 'fixed' ? 'fixed' : 'percentage',
              discountValue: parseFloat(couponRecord.discountValue),
              minPurchase: parseFloat(couponRecord.minPurchase),
              maxUses: couponRecord.maxUses,
              usedCount: couponRecord.usedCount,
              expiresAt: couponRecord.expiresAt,
              isActive: couponRecord.isActive,
            }
          : null,
        baseDeliveryFee: parseFloat(zone.fee),
        freeDeliveryThreshold: freeThreshold,
        taxRatePercent: taxRate,
      });

      if (totals.couponError) {
        throw new Error(totals.couponError);
      }

      const minZoneOrder = parseFloat(zone.minOrderAmount);
      if (minZoneOrder > 0 && totals.subtotal < minZoneOrder) {
        throw new Error(
          `Montant minimum pour la zone "${zone.name}" : ${minZoneOrder.toFixed(2)} DH.`
        );
      }

      const countRes = await tx.select({ count: sql<number>`count(*)::int` }).from(orders);
      const nextSeq = (countRes[0]?.count ?? 0) + 1;
      const orderNumber = generateOrderNumber(nextSeq);

      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber,
          userId: req.authUser?.id ?? null,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: (customerEmail || '').trim(),
          city: zone.isStorePickup ? 'Aït Melloul' : city.trim(),
          address: zone.isStorePickup
            ? 'Retrait en magasin — Librairie Amine, Aït Melloul'
            : address.trim(),
          instructions: (instructions || '').trim(),
          deliveryZoneId: zone.id,
          deliveryMethod: zone.name,
          paymentMethod: paymentMethod || 'cod',
          paymentStatus: 'pending',
          status: 'pending',
          subtotal: totals.subtotal.toFixed(2),
          discountAmount: totals.discountAmount.toFixed(2),
          deliveryFee: totals.deliveryFee.toFixed(2),
          taxAmount: totals.taxAmount.toFixed(2),
          totalAmount: totals.totalAmount.toFixed(2),
          couponCode: couponRecord && !totals.couponError ? couponRecord.code : '',
          stockDeducted: true,
        })
        .returning();

      for (const item of resolvedItems) {
        await tx.insert(orderItems).values({
          orderId: order.id,
          productId: item.product.id,
          productName: item.product.name,
          productSku: item.product.sku,
          unitPrice: item.unitPrice.toFixed(2),
          quantity: item.quantity,
          totalPrice: item.totalPrice.toFixed(2),
        });

        // Atomic stock deduction preventing overselling
        const updatedProd = await tx
          .update(products)
          .set({
            stockQuantity: sql`${products.stockQuantity} - ${item.quantity}`,
            salesCount: sql`${products.salesCount} + ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(products.id, item.product.id),
              sql`${products.stockQuantity} >= ${item.quantity}`
            )
          )
          .returning();

        if (!updatedProd[0]) {
          throw new Error(`Stock insuffisant lors de la validation pour "${item.product.name}".`);
        }

        const newStock = updatedProd[0].stockQuantity;
        await tx.insert(inventoryMovements).values({
          productId: item.product.id,
          movementType: 'order',
          quantityDelta: -item.quantity,
          previousStock: item.product.stockQuantity,
          newStock,
          reason: `Commande ${orderNumber}`,
          createdBy: customerName.trim(),
        });

        if (newStock === 0) {
          await tx.insert(notifications).values({
            type: 'out_of_stock',
            title: `Rupture de stock : ${item.product.name}`,
            message: `Le produit ${item.product.sku} est désormais en rupture de stock suite à la commande ${orderNumber}.`,
          });
        } else if (newStock <= item.product.alertThreshold) {
          await tx.insert(notifications).values({
            type: 'low_stock',
            title: `Stock faible : ${item.product.name}`,
            message: `Il ne reste que ${newStock} unité(s) pour ${item.product.sku}.`,
          });
        }
      }

      if (couponRecord && !totals.couponError) {
        await tx
          .update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1` })
          .where(eq(coupons.id, couponRecord.id));
      }

      await tx.insert(payments).values({
        orderId: order.id,
        method: paymentMethod || 'cod',
        provider:
          paymentMethod === 'bank_transfer'
            ? 'Virement bancaire'
            : paymentMethod === 'online'
              ? String(paymentSettings.onlineProvider || 'En ligne')
              : 'Paiement à la livraison',
        amount: totals.totalAmount.toFixed(2),
        status: 'pending',
        reference: '',
      });

      await tx.insert(deliveries).values({
        orderId: order.id,
        zoneName: zone.name,
        trackingCode: `TRK-${orderNumber}`,
        carrier: zone.isStorePickup ? 'Retrait en magasin' : 'Livraison Librairie Amine',
        status: 'pending',
        estimatedDate: zone.estimatedDelay,
      });

      await tx.insert(notifications).values({
        type: 'new_order',
        title: `Nouvelle commande ${orderNumber}`,
        message: `${customerName.trim()} (${customerPhone.trim()}) — Total : ${totals.totalAmount.toFixed(2)} DH`,
        metadata: { orderId: order.id, orderNumber },
      });

      if (req.authUser) {
        await tx
          .update(customerProfiles)
          .set({
            ordersCount: sql`${customerProfiles.ordersCount} + 1`,
            totalSpent: sql`${customerProfiles.totalSpent} + ${totals.totalAmount.toFixed(2)}::numeric`,
            updatedAt: new Date(),
          })
          .where(eq(customerProfiles.userId, req.authUser.id));
      }

      return order;
    });

    const itemsCreated = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, createdOrder.id));

    res.status(201).json({
      order: createdOrder,
      items: itemsCreated,
    });
  } catch (error: any) {
    console.error('Order creation error:', error);
    res.status(400).json({
      error: error?.message || 'Impossible d’enregistrer la commande.',
    });
  }
});

router.get('/orders/track', optionalAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const orderNumber = String(req.query.orderNumber || '').trim().toUpperCase();
    const phone = String(req.query.phone || '').trim();

    if (!orderNumber) {
      return res.status(400).json({ error: 'Veuillez saisir un numéro de commande.' });
    }

    const found = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);

    const order = found[0];
    if (!order) {
      return res.status(404).json({ error: 'Aucune commande trouvée avec ce numéro.' });
    }

    const isOwner = req.authUser && (req.authUser.id === order.userId || req.authUser.role === 'admin');
    if (!isOwner) {
      if (!phone) {
        return res.status(400).json({
          error: 'Veuillez renseigner le numéro de téléphone associé à la commande.',
        });
      }
      const normalize = (v: string) => v.replace(/\D/g, '').slice(-8);
      if (normalize(phone) !== normalize(order.customerPhone)) {
        return res.status(403).json({
          error: 'Le numéro de téléphone ne correspond pas à cette commande.',
        });
      }
    }

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    const delivery = (
      await db.select().from(deliveries).where(eq(deliveries.orderId, order.id)).limit(1)
    )[0];

    res.json({ order, items, delivery });
  } catch (error) {
    console.error('Error tracking order:', error);
    res.status(500).json({ error: 'Erreur lors du suivi de la commande.' });
  }
});

router.post('/newsletter', async (req, res) => {
  try {
    await ensureSeeded();
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Veuillez saisir une adresse e-mail valide.' });
    }
    await db
      .insert(newsletters)
      .values({ email, isActive: true })
      .onConflictDoUpdate({
        target: newsletters.email,
        set: { isActive: true },
      });
    res.json({ message: 'Votre inscription à la newsletter a bien été enregistrée.' });
  } catch (error) {
    console.error('Newsletter error:', error);
    res.status(500).json({ error: 'Impossible d’enregistrer votre inscription.' });
  }
});

router.post('/contact', async (req, res) => {
  try {
    await ensureSeeded();
    const { name, phone, email, subject, message } = req.body;
    if (!name?.trim() || !phone?.trim() || !subject?.trim() || !message?.trim()) {
      return res.status(400).json({
        error: 'Veuillez remplir tous les champs obligatoires (nom, téléphone, sujet, message).',
      });
    }

    const [created] = await db
      .insert(contactMessages)
      .values({
        name: name.trim(),
        phone: phone.trim(),
        email: (email || '').trim(),
        subject: subject.trim(),
        message: message.trim(),
      })
      .returning();

    await db.insert(notifications).values({
      type: 'contact_message',
      title: `Nouveau message : ${subject.trim()}`,
      message: `De ${name.trim()} (${phone.trim()})`,
      metadata: { contactId: created.id },
    });

    res.status(201).json({
      message: 'Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.',
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Erreur lors de l’envoi du message.' });
  }
});

export default router;
