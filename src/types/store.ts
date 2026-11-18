export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  parentId: number | null;
  displayOrder: number;
  isActive: boolean;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  isActive: boolean;
}

export interface ProductImage {
  id: number;
  productId: number;
  url: string;
  altText: string;
  displayOrder: number;
  isPrimary: boolean;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  sku: string;
  barcode: string;
  categoryId: number | null;
  brandId: number | null;
  shortDescription: string;
  description: string;
  specifications: Record<string, string>;
  price: string;
  promoPrice: string | null;
  costPrice: string;
  priceNum: number;
  promoPriceNum: number | null;
  effectivePrice: number;
  discountPercent: number;
  stockQuantity: number;
  alertThreshold: number;
  weightGrams: number;
  status: string;
  isFeatured: boolean;
  isBestSeller: boolean;
  isSample: boolean;
  promoExpiresAt: string | null;
  salesCount: number;
  createdAt: string;
  category: { id: number; name: string; slug: string } | null;
  brand: { id: number; name: string; slug: string } | null;
  images: ProductImage[];
  primaryImage: string;
}

export interface DeliveryZone {
  id: number;
  name: string;
  city: string;
  fee: string;
  minOrderAmount: string;
  estimatedDelay: string;
  isStorePickup: boolean;
  isActive: boolean;
  isSample: boolean;
  displayOrder: number;
}

export interface Review {
  id: number;
  productId: number | null;
  authorName: string;
  authorRole: string;
  rating: number;
  comment: string;
  isApproved: boolean;
  isStoreTestimonial: boolean;
  isSample: boolean;
  createdAt: string;
}

export interface StoreSettingsMap {
  general: {
    storeName: string;
    tagline: string;
    description: string;
    address: string;
    city: string;
    phone: string;
    whatsapp: string;
    email: string;
    openingHours: string;
    socialFacebook: string;
    socialInstagram: string;
    mapsLat: number;
    mapsLng: number;
    logoUrl: string;
  };
  branding: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
  currency: {
    code: string;
    symbol: string;
    decimals: number;
  };
  delivery: {
    freeDeliveryThreshold: number | null;
    storePickupEnabled: boolean;
    storePickupLabel: string;
    defaultDelayNote: string;
  };
  payment: {
    codEnabled: boolean;
    codLabel: string;
    codInstructions: string;
    onlineEnabled: boolean;
    onlineProvider: string;
    onlineMerchantId: string;
    onlineInstructions: string;
    bankTransferEnabled: boolean;
    bankTransferLabel: string;
    bankTransferInstructions: string;
  };
  tax: {
    enabled: boolean;
    ratePercent: number;
    label: string;
  };
  notifications: Record<string, boolean>;
  homepage: {
    announcementEnabled: boolean;
    announcementText: string;
    heroHeadline: string;
    heroSubtitle: string;
    heroImage: string;
    promoBannerTitle: string;
    promoBannerSubtitle: string;
    visibleSections: Record<string, boolean>;
    sectionsOrder: string[];
  };
  seo: {
    siteTitle: string;
    metaDescription: string;
    ogImage: string;
  };
  about: {
    intro: string;
    history: string;
    mission: string;
    values: string;
    commitment: string;
    image: string;
  };
}

export interface CartItem {
  productId: number;
  slug: string;
  name: string;
  sku: string;
  unitPrice: number;
  regularPrice: number;
  image: string;
  quantity: number;
  stockQuantity: number;
}

export interface AuthUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  role: 'customer' | 'admin';
}
