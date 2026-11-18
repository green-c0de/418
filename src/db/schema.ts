import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  fullName: text('full_name').notNull().default(''),
  phone: text('phone').notNull().default(''),
  role: text('role').notNull().default('customer'), // 'customer' | 'admin'
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const customerProfiles = pgTable('customer_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  defaultCity: text('default_city').notNull().default('Aït Melloul'),
  notes: text('notes').notNull().default(''),
  totalSpent: numeric('total_spent', { precision: 12, scale: 2 }).notNull().default('0.00'),
  ordersCount: integer('orders_count').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  roleLabel: text('role_label').notNull().default('Administrateur principal'),
  permissions: jsonb('permissions').$type<string[]>().notNull().default(['all']),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  imageUrl: text('image_url').notNull().default(''),
  parentId: integer('parent_id'),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const brands = pgTable('brands', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  logoUrl: text('logo_url').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  sku: text('sku').notNull().unique(),
  barcode: text('barcode').notNull().default(''),
  categoryId: integer('category_id')
    .references(() => categories.id, { onDelete: 'set null' }),
  brandId: integer('brand_id')
    .references(() => brands.id, { onDelete: 'set null' }),
  shortDescription: text('short_description').notNull().default(''),
  description: text('description').notNull().default(''),
  specifications: jsonb('specifications').$type<Record<string, string>>().notNull().default({}),
  price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0.00'),
  promoPrice: numeric('promo_price', { precision: 10, scale: 2 }),
  costPrice: numeric('cost_price', { precision: 10, scale: 2 }).notNull().default('0.00'),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  alertThreshold: integer('alert_threshold').notNull().default(5),
  weightGrams: integer('weight_grams').notNull().default(0),
  status: text('status').notNull().default('active'), // 'active' | 'draft' | 'archived'
  isFeatured: boolean('is_featured').notNull().default(false),
  isBestSeller: boolean('is_best_seller').notNull().default(false),
  isSample: boolean('is_sample').notNull().default(false),
  promoExpiresAt: timestamp('promo_expires_at'),
  salesCount: integer('sales_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const productImages = pgTable('product_images', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  url: text('url').notNull(),
  altText: text('alt_text').notNull().default(''),
  displayOrder: integer('display_order').notNull().default(0),
  isPrimary: boolean('is_primary').notNull().default(false),
});

export const addresses = pgTable('addresses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  label: text('label').notNull().default('Domicile'),
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull(),
  city: text('city').notNull(),
  addressLine: text('address_line').notNull(),
  postalCode: text('postal_code').notNull().default(''),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const deliveryZones = pgTable('delivery_zones', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  fee: numeric('fee', { precision: 10, scale: 2 }).notNull().default('0.00'),
  minOrderAmount: numeric('min_order_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  estimatedDelay: text('estimated_delay').notNull().default('À confirmer'),
  isStorePickup: boolean('is_store_pickup').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  isSample: boolean('is_sample').notNull().default(false),
  displayOrder: integer('display_order').notNull().default(0),
});

export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  discountType: text('discount_type').notNull().default('percentage'), // 'percentage' | 'fixed'
  discountValue: numeric('discount_value', { precision: 10, scale: 2 }).notNull(),
  minPurchase: numeric('min_purchase', { precision: 10, scale: 2 }).notNull().default('0.00'),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').notNull().default(0),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').notNull().default(true),
  description: text('description').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email').notNull().default(''),
  city: text('city').notNull(),
  address: text('address').notNull(),
  instructions: text('instructions').notNull().default(''),
  deliveryZoneId: integer('delivery_zone_id').references(() => deliveryZones.id, { onDelete: 'set null' }),
  deliveryMethod: text('delivery_method').notNull(),
  paymentMethod: text('payment_method').notNull(), // 'cod' | 'online' | 'bank_transfer'
  paymentStatus: text('payment_status').notNull().default('pending'), // 'pending' | 'paid' | 'failed' | 'refunded'
  status: text('status').notNull().default('pending'), // 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  discountAmount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  deliveryFee: numeric('delivery_fee', { precision: 10, scale: 2 }).notNull().default('0.00'),
  taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  couponCode: text('coupon_code').notNull().default(''),
  internalNotes: text('internal_notes').notNull().default(''),
  stockDeducted: boolean('stock_deducted').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
  productName: text('product_name').notNull(),
  productSku: text('product_sku').notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull(),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  method: text('method').notNull(),
  provider: text('provider').notNull().default('Manuel'),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('pending'),
  reference: text('reference').notNull().default(''),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const deliveries = pgTable('deliveries', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  zoneName: text('zone_name').notNull(),
  trackingCode: text('tracking_code').notNull().default(''),
  carrier: text('carrier').notNull().default('Livraison Librairie Amine'),
  status: text('status').notNull().default('pending'),
  estimatedDate: text('estimated_date').notNull().default(''),
  deliveredAt: timestamp('delivered_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  contactName: text('contact_name').notNull().default(''),
  phone: text('phone').notNull().default(''),
  email: text('email').notNull().default(''),
  city: text('city').notNull().default(''),
  address: text('address').notNull().default(''),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const inventoryMovements = pgTable('inventory_movements', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  supplierId: integer('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
  movementType: text('movement_type').notNull(), // 'in' | 'out' | 'adjustment' | 'order' | 'return'
  quantityDelta: integer('quantity_delta').notNull(),
  previousStock: integer('previous_stock').notNull(),
  newStock: integer('new_stock').notNull(),
  reason: text('reason').notNull().default(''),
  createdBy: text('created_by').notNull().default('Système'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  authorName: text('author_name').notNull(),
  authorRole: text('author_role').notNull().default('Client'),
  rating: integer('rating').notNull().default(5),
  comment: text('comment').notNull(),
  isApproved: boolean('is_approved').notNull().default(true),
  isStoreTestimonial: boolean('is_store_testimonial').notNull().default(false),
  isSample: boolean('is_sample').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const newsletters = pgTable('newsletters', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const storeSettings = pgTable('store_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: jsonb('value').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const adminActivityLogs = pgTable('admin_activity_logs', {
  id: serial('id').primaryKey(),
  adminEmail: text('admin_email').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull().default(''),
  details: text('details').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const wishlists = pgTable('wishlists', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const contactMessages = pgTable('contact_messages', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull().default(''),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull().default('new'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  images: many(productImages),
  reviews: many(reviews),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
  payments: many(payments),
  delivery: one(deliveries, {
    fields: [orders.id],
    references: [deliveries.orderId],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));
