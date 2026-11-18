export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: 'Paiement à la livraison',
  online: 'Paiement en ligne',
  bank_transfer: 'Virement bancaire',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payé',
  failed: 'Échoué',
  refunded: 'Remboursé',
};

export interface CartCalculationItem {
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  availableStock: number;
}

export interface CouponInput {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | Date | null;
  isActive: boolean;
}

export interface TotalsResult {
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  taxAmount: number;
  totalAmount: number;
  freeDeliveryApplied: boolean;
  couponError?: string;
}

export function roundMoney(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatMAD(amount: number | string, decimals = 2): string {
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(numeric)) {
    return `0,${'0'.repeat(decimals)} DH`;
  }
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numeric);
  return `${formatted} DH`;
}

export function formatDateFR(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Africa/Casablanca',
  }).format(date);
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function computeDiscountPercent(price: number, promoPrice: number | null): number {
  if (!promoPrice || promoPrice <= 0 || promoPrice >= price || price <= 0) {
    return 0;
  }
  return Math.round(((price - promoPrice) / price) * 100);
}

export function validateStockForItems(items: CartCalculationItem[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  for (const item of items) {
    if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      errors.push(`Quantité invalide pour ${item.name}.`);
    } else if (item.quantity > item.availableStock) {
      errors.push(
        `Stock insuffisant pour "${item.name}" (disponible : ${item.availableStock}).`
      );
    }
  }
  return { valid: errors.length === 0, errors };
}

export function calculateOrderTotals(params: {
  items: { unitPrice: number; quantity: number }[];
  coupon?: CouponInput | null;
  baseDeliveryFee: number;
  freeDeliveryThreshold?: number | null;
  taxRatePercent?: number;
  now?: Date;
}): TotalsResult {
  const now = params.now ?? new Date();
  const subtotal = roundMoney(
    params.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  );

  let discountAmount = 0;
  let couponError: string | undefined;

  if (params.coupon) {
    const c = params.coupon;
    if (!c.isActive) {
      couponError = 'Ce code promotionnel est désactivé.';
    } else if (c.expiresAt && new Date(c.expiresAt).getTime() < now.getTime()) {
      couponError = 'Ce code promotionnel a expiré.';
    } else if (c.maxUses !== null && c.usedCount >= c.maxUses) {
      couponError = 'Ce code promotionnel a atteint sa limite d’utilisation.';
    } else if (subtotal < c.minPurchase) {
      couponError = `Montant minimum d’achat requis : ${formatMAD(c.minPurchase)}.`;
    } else {
      if (c.discountType === 'percentage') {
        discountAmount = roundMoney((subtotal * c.discountValue) / 100);
      } else {
        discountAmount = roundMoney(Math.min(c.discountValue, subtotal));
      }
    }
  }

  const discountedSubtotal = roundMoney(Math.max(0, subtotal - discountAmount));
  const threshold = params.freeDeliveryThreshold ?? null;
  const freeDeliveryApplied =
    threshold !== null && threshold > 0 && discountedSubtotal >= threshold;
  const deliveryFee = freeDeliveryApplied ? 0 : roundMoney(Math.max(0, params.baseDeliveryFee));

  const taxRate = params.taxRatePercent ?? 0;
  const taxAmount = taxRate > 0 ? roundMoney((discountedSubtotal * taxRate) / 100) : 0;
  const totalAmount = roundMoney(discountedSubtotal + deliveryFee + taxAmount);

  return {
    subtotal,
    discountAmount,
    deliveryFee,
    taxAmount,
    totalAmount,
    freeDeliveryApplied,
    couponError,
  };
}

export function generateOrderNumber(sequenceNumber: number, date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const seq = String(sequenceNumber).padStart(4, '0');
  return `LA-${year}${month}-${seq}`;
}

export interface ParsedCsvProduct {
  sku: string;
  name: string;
  price: number;
  promoPrice: number | null;
  stockQuantity: number;
  categorySlug: string;
  brandSlug: string;
  shortDescription: string;
}

export function parseProductsCsv(csvText: string): ParsedCsvProduct[] {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const splitRow = (row: string) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i += 1) {
      const ch = row[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const headers = splitRow(lines[0]).map((h) => h.toLowerCase());
  const idx = (key: string) => headers.indexOf(key);

  const results: ParsedCsvProduct[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitRow(lines[i]);
    const sku = cols[idx('sku')] ?? '';
    const name = cols[idx('nom')] ?? cols[idx('name')] ?? '';
    if (!sku || !name) continue;
    const rawPrice = parseFloat((cols[idx('prix')] ?? cols[idx('price')] ?? '0').replace(',', '.'));
    const rawPromo = cols[idx('prix_promo')] ?? cols[idx('promo_price')] ?? '';
    const promoVal = rawPromo ? parseFloat(rawPromo.replace(',', '.')) : null;
    const stock = parseInt(cols[idx('stock')] ?? cols[idx('stock_quantity')] ?? '0', 10);

    results.push({
      sku,
      name,
      price: Number.isFinite(rawPrice) ? rawPrice : 0,
      promoPrice: promoVal !== null && Number.isFinite(promoVal) && promoVal > 0 ? promoVal : null,
      stockQuantity: Number.isFinite(stock) ? Math.max(0, stock) : 0,
      categorySlug: cols[idx('categorie')] ?? cols[idx('category')] ?? 'fournitures-scolaires',
      brandSlug: cols[idx('marque')] ?? cols[idx('brand')] ?? '',
      shortDescription: cols[idx('description')] ?? '',
    });
  }
  return results;
}
