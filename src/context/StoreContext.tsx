import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  AuthUser,
  Brand,
  CartItem,
  Category,
  DeliveryZone,
  Product,
  Review,
  StoreSettingsMap,
} from '../types/store';

interface StoreContextValue {
  pathname: string;
  searchQuery: string;
  navigate: (to: string) => void;
  loadingStorefront: boolean;
  settings: StoreSettingsMap | null;
  categories: Category[];
  brands: Brand[];
  deliveryZones: DeliveryZone[];
  testimonials: Review[];
  googleMapsApiKey: string;
  refreshStorefront: () => Promise<void>;
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: number, quantity: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  appliedCoupon: { code: string; discountAmount: number; description: string } | null;
  setAppliedCoupon: (
    coupon: { code: string; discountAmount: number; description: string } | null
  ) => void;
  quickViewProduct: Product | null;
  setQuickViewProduct: (product: Product | null) => void;
  user: AuthUser | null;
  token: string | null;
  setSession: (token: string | null, user: AuthUser | null) => void;
  logout: () => void;
  wishlistIds: number[];
  toggleWishlist: (productId: number) => Promise<void>;
  toast: string | null;
  showToast: (msg: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const CART_STORAGE_KEY = 'librairie_amine_cart_v1';
const AUTH_TOKEN_KEY = 'librairie_amine_token_v1';
const AUTH_USER_KEY = 'librairie_amine_user_v1';
const LOCAL_WISHLIST_KEY = 'librairie_amine_wishlist_v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [searchQuery, setSearchQuery] = useState(() => window.location.search);
  const [loadingStorefront, setLoadingStorefront] = useState(true);
  const [settings, setSettings] = useState<StoreSettingsMap | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [testimonials, setTestimonials] = useState<Review[]>([]);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    description: string;
  } | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const [token, setToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = sessionStorage.getItem(AUTH_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [wishlistIds, setWishlistIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_WISHLIST_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const navigate = useCallback((to: string) => {
    const url = new URL(to, window.location.origin);
    if (url.pathname === window.location.pathname && url.search === window.location.search) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.history.pushState({}, '', to);
    setPathname(url.pathname);
    setSearchQuery(url.search);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  useEffect(() => {
    const onPop = () => {
      setPathname(window.location.pathname);
      setSearchQuery(window.location.search);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const refreshStorefront = useCallback(async () => {
    try {
      const res = await fetch('/api/storefront');
      if (!res.ok) throw new Error('Erreur chargement boutique');
      const data = await res.json();
      setSettings(data.settings);
      setCategories(data.categories || []);
      setBrands(data.brands || []);
      setDeliveryZones(data.deliveryZones || []);
      setTestimonials(data.testimonials || []);
      setGoogleMapsApiKey(data.googleMapsApiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '');
      if (data.settings?.seo?.siteTitle) {
        document.title = data.settings.seo.siteTitle;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStorefront(false);
    }
  }, []);

  useEffect(() => {
    refreshStorefront();
  }, [refreshStorefront]);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage quota errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(wishlistIds));
    } catch {
      // Ignore
    }
  }, [wishlistIds]);

  const setSession = useCallback((newToken: string | null, newUser: AuthUser | null) => {
    setToken(newToken);
    setUser(newUser);
    try {
      if (newToken && newUser) {
        sessionStorage.setItem(AUTH_TOKEN_KEY, newToken);
        sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));
      } else {
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        sessionStorage.removeItem(AUTH_USER_KEY);
      }
    } catch {
      // Ignore
    }
  }, []);

  const logout = useCallback(() => {
    setSession(null, null);
    showToast('Vous êtes déconnecté.');
  }, [setSession, showToast]);

  const addToCart = useCallback(
    (product: Product, quantity = 1) => {
      if (product.stockQuantity <= 0) {
        showToast('Ce article est actuellement en rupture de stock.');
        return;
      }
      setCart((prev) => {
        const existing = prev.find((item) => item.productId === product.id);
        if (existing) {
          const nextQty = Math.min(product.stockQuantity, existing.quantity + quantity);
          return prev.map((item) =>
            item.productId === product.id ? { ...item, quantity: nextQty } : item
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            sku: product.sku,
            unitPrice: product.effectivePrice,
            regularPrice: product.priceNum,
            image: product.primaryImage || product.images?.[0]?.url || '',
            quantity: Math.min(product.stockQuantity, Math.max(1, quantity)),
            stockQuantity: product.stockQuantity,
          },
        ];
      });
      showToast(`"${product.name}" ajouté au panier.`);
      setCartOpen(true);
    },
    [showToast]
  );

  const updateCartQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(item.stockQuantity, quantity) }
          : item
      )
    );
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setAppliedCoupon(null);
  }, []);

  const toggleWishlist = useCallback(
    async (productId: number) => {
      if (token) {
        try {
          const res = await fetch(`/api/account/wishlist/${productId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setWishlistIds((prev) =>
              data.wishlisted
                ? Array.from(new Set([...prev, productId]))
                : prev.filter((id) => id !== productId)
            );
            showToast(
              data.wishlisted
                ? 'Ajouté à votre liste de souhaits.'
                : 'Retiré de votre liste de souhaits.'
            );
            return;
          }
        } catch {
          // fallback local
        }
      }
      setWishlistIds((prev) => {
        const exists = prev.includes(productId);
        showToast(
          exists ? 'Retiré de votre liste de souhaits.' : 'Ajouté à votre liste de souhaits.'
        );
        return exists ? prev.filter((id) => id !== productId) : [...prev, productId];
      });
    },
    [token, showToast]
  );

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartSubtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <StoreContext.Provider
      value={{
        pathname,
        searchQuery,
        navigate,
        loadingStorefront,
        settings,
        categories,
        brands,
        deliveryZones,
        testimonials,
        googleMapsApiKey,
        refreshStorefront,
        cart,
        cartCount,
        cartSubtotal,
        cartOpen,
        setCartOpen,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        appliedCoupon,
        setAppliedCoupon,
        quickViewProduct,
        setQuickViewProduct,
        user,
        token,
        setSession,
        logout,
        wishlistIds,
        toggleWishlist,
        toast,
        showToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
