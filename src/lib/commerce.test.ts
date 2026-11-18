import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOrderTotals,
  computeDiscountPercent,
  formatMAD,
  generateOrderNumber,
  parseProductsCsv,
  slugify,
  validateStockForItems,
} from './commerce';

test('formatMAD formats Moroccan dirhams cleanly with fr-FR locale', () => {
  const formatted = formatMAD(125.5);
  assert.ok(formatted.endsWith('DH'));
  assert.ok(formatted.includes('125,50'));
});

test('computeDiscountPercent computes accurate integer discount percentage', () => {
  assert.equal(computeDiscountPercent(100, 75), 25);
  assert.equal(computeDiscountPercent(100, null), 0);
  assert.equal(computeDiscountPercent(100, 120), 0);
});

test('validateStockForItems prevents overselling', () => {
  const ok = validateStockForItems([
    { productId: 1, name: 'Cahier A4', unitPrice: 20, quantity: 3, availableStock: 5 },
  ]);
  assert.equal(ok.valid, true);

  const fail = validateStockForItems([
    { productId: 1, name: 'Cahier A4', unitPrice: 20, quantity: 6, availableStock: 5 },
  ]);
  assert.equal(fail.valid, false);
  assert.match(fail.errors[0], /Stock insuffisant/);
});

test('calculateOrderTotals handles percentage coupons, free shipping threshold, and tax', () => {
  const result = calculateOrderTotals({
    items: [
      { unitPrice: 100, quantity: 2 },
      { unitPrice: 50, quantity: 1 },
    ],
    coupon: {
      code: 'RENTREE10',
      discountType: 'percentage',
      discountValue: 10,
      minPurchase: 100,
      maxUses: 50,
      usedCount: 2,
      expiresAt: null,
      isActive: true,
    },
    baseDeliveryFee: 25,
    freeDeliveryThreshold: 200,
    taxRatePercent: 0,
  });

  assert.equal(result.subtotal, 250);
  assert.equal(result.discountAmount, 25);
  assert.equal(result.freeDeliveryApplied, true);
  assert.equal(result.deliveryFee, 0);
  assert.equal(result.totalAmount, 225);
});

test('calculateOrderTotals rejects expired coupon and keeps delivery fee when below threshold', () => {
  const result = calculateOrderTotals({
    items: [{ unitPrice: 80, quantity: 1 }],
    coupon: {
      code: 'EXPIRE',
      discountType: 'fixed',
      discountValue: 20,
      minPurchase: 0,
      maxUses: null,
      usedCount: 0,
      expiresAt: '2020-01-01T00:00:00Z',
      isActive: true,
    },
    baseDeliveryFee: 20,
    freeDeliveryThreshold: 200,
    now: new Date('2026-01-01T00:00:00Z'),
  });

  assert.equal(result.discountAmount, 0);
  assert.equal(result.deliveryFee, 20);
  assert.equal(result.totalAmount, 100);
  assert.ok(result.couponError);
});

test('generateOrderNumber formats unique sequential order reference', () => {
  const num = generateOrderNumber(42, new Date('2026-09-05T10:00:00Z'));
  assert.equal(num, 'LA-202609-0042');
});

test('slugify removes French accents cleanly', () => {
  assert.equal(slugify('Fournitures de Bureau & Papeterie'), 'fournitures-de-bureau-papeterie');
  assert.equal(slugify('Matériel Pédagogique'), 'materiel-pedagogique');
});

test('parseProductsCsv parses French semicolon CSV rows', () => {
  const csv = `sku;nom;prix;prix_promo;stock;categorie;marque;description
SKU-001;Cahier 200p;25.00;19.50;40;cahiers-et-blocs-notes;oxford;Cahier grand format`;
  const parsed = parseProductsCsv(csv);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].sku, 'SKU-001');
  assert.equal(parsed[0].price, 25);
  assert.equal(parsed[0].promoPrice, 19.5);
  assert.equal(parsed[0].stockQuantity, 40);
});
