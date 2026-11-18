import React, { useState } from 'react';
import {
  ChevronDown,
  Heart,
  Menu,
  Phone,
  Search,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function Header() {
  const {
    pathname,
    navigate,
    settings,
    categories,
    cartCount,
    setCartOpen,
    user,
    wishlistIds,
  } = useStore();

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoriesDropdown, setCategoriesDropdown] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const primaryColor = settings?.branding?.primaryColor || '#172B4D';
  const accentColor = settings?.branding?.secondaryColor || '#F59E0B';
  const showAnnouncement =
    !bannerDismissed &&
    Boolean(settings) &&
    settings?.homepage?.announcementEnabled !== false;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    setSearchOpen(false);
    setMobileMenuOpen(false);
    navigate(q ? `/boutique?search=${encodeURIComponent(q)}` : '/boutique');
  };

  const navLinkClass = (active: boolean) =>
    `text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 py-1 border-b-2 ${
      active
        ? 'text-[#172B4D] border-[#F59E0B]'
        : 'text-[#252B36]/80 border-transparent hover:text-[#172B4D] hover:border-slate-300'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 no-print">
      {showAnnouncement && (
        <div
          style={{ backgroundColor: primaryColor }}
          className="text-white text-xs px-4 py-1.5 flex items-center justify-between gap-4"
        >
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
            <div className="hidden lg:flex items-center gap-2 text-white/80 whitespace-nowrap shrink-0">
              <Phone className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>{settings?.general?.phone || '+212 5XX-XX-XX-XX'}</span>
            </div>
            <p className="truncate text-center flex-1 font-medium">
              {settings?.homepage?.announcementText ||
                'Bienvenue à la Librairie Amine — Aït Melloul, Maroc.'}
            </p>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label="Fermer l'annonce"
              className="text-white/75 hover:text-white p-0.5 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden p-2 -ml-2 text-[#172B4D] hover:bg-slate-100 rounded-lg"
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0"
          >
            {settings?.general?.logoUrl && (
              <img
                src={settings.general.logoUrl}
                alt={settings.general.storeName || 'Librairie Amine'}
                referrerPolicy="no-referrer"
                className="h-8 w-auto object-contain"
              />
            )}
            <span
              style={{ color: primaryColor }}
              className="font-display text-lg sm:text-xl font-bold tracking-tight"
            >
              {settings?.general?.storeName || 'Librairie Amine'}
            </span>
          </a>
        </div>

        {/* Zone 2: Primary Navigation */}
        <nav
          aria-label="Navigation principale"
          className="hidden lg:flex items-center gap-6"
        >
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            className={navLinkClass(pathname === '/')}
          >
            Accueil
          </a>
          <a
            href="/boutique"
            onClick={(e) => {
              e.preventDefault();
              navigate('/boutique');
            }}
            className={navLinkClass(pathname === '/boutique')}
          >
            Boutique
          </a>

          <div
            className="relative"
            onMouseEnter={() => setCategoriesDropdown(true)}
            onMouseLeave={() => setCategoriesDropdown(false)}
          >
            <button
              type="button"
              onClick={() => setCategoriesDropdown((v) => !v)}
              aria-expanded={categoriesDropdown}
              className="flex items-center gap-1 text-sm font-medium text-[#252B36]/80 hover:text-[#172B4D] whitespace-nowrap shrink-0 py-1"
            >
              <span>Catégories</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {categoriesDropdown && (
              <div className="absolute left-0 top-full pt-2 w-72 z-50">
                <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-2 grid gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoriesDropdown(false);
                      navigate('/boutique?sort=newest');
                    }}
                    className="text-left px-3 py-2 text-sm font-medium text-[#172B4D] hover:bg-[#F5F7FA] rounded-lg"
                  >
                    Nouveautés
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCategoriesDropdown(false);
                      navigate('/boutique?bestSeller=true');
                    }}
                    className="text-left px-3 py-2 text-sm font-medium text-[#172B4D] hover:bg-[#F5F7FA] rounded-lg"
                  >
                    Meilleures ventes
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategoriesDropdown(false);
                        navigate(`/boutique?category=${encodeURIComponent(cat.slug)}`);
                      }}
                      className="text-left px-3 py-1.5 text-sm text-[#252B36] hover:bg-[#F5F7FA] hover:text-[#172B4D] rounded-lg truncate"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <a
            href="/boutique?promo=true"
            onClick={(e) => {
              e.preventDefault();
              navigate('/boutique?promo=true');
            }}
            className={navLinkClass(false)}
          >
            Promotions
          </a>
          <a
            href="/a-propos"
            onClick={(e) => {
              e.preventDefault();
              navigate('/a-propos');
            }}
            className={navLinkClass(pathname === '/a-propos')}
          >
            À propos
          </a>
          <a
            href="/contact"
            onClick={(e) => {
              e.preventDefault();
              navigate('/contact');
            }}
            className={navLinkClass(pathname === '/contact')}
          >
            Contact
          </a>
        </nav>

        {/* Zone 3: Search, Account, Wishlist, Cart */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Rechercher un produit"
            className="p-2 text-[#252B36] hover:bg-[#F5F7FA] rounded-lg transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/compte?tab=wishlist')}
            aria-label="Ma liste de souhaits"
            className="relative p-2 text-[#252B36] hover:bg-[#F5F7FA] rounded-lg transition-colors hidden sm:inline-flex"
          >
            <Heart className="w-5 h-5" />
            {wishlistIds.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[11px] font-semibold bg-[#F59E0B] text-white rounded-full flex items-center justify-center tabular-nums">
                {wishlistIds.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/compte')}
            aria-label={user ? `Mon compte (${user.fullName})` : 'Mon compte'}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#252B36] hover:bg-[#F5F7FA] rounded-lg whitespace-nowrap shrink-0 transition-colors"
          >
            <User className="w-4 h-4" />
            <span className="max-w-[110px] truncate">
              {user ? user.fullName.split(' ')[0] : 'Mon compte'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Ouvrir mon panier (${cartCount} articles)`}
            style={{ backgroundColor: primaryColor }}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-95 transition-opacity whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-4 h-4" style={{ color: accentColor }} />
            <span className="hidden sm:inline">Panier</span>
            <span className="font-mono-num text-xs bg-white/15 px-1.5 py-0.5 rounded">
              {cartCount}
            </span>
          </button>
        </div>
      </div>

      {/* Expandable Search Bar */}
      {searchOpen && (
        <div className="border-t border-slate-100 bg-[#F5F7FA] px-4 py-3">
          <form onSubmit={handleSearchSubmit} className="max-w-3xl mx-auto flex gap-2">
            <label htmlFor="header-search-input" className="sr-only">
              Rechercher dans la boutique
            </label>
            <input
              id="header-search-input"
              type="search"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un cahier, stylo, livre, référence SKU..."
              className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-[#252B36] focus:outline-none focus:ring-2 focus:ring-[#172B4D]"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#172B4D] text-white text-sm font-semibold rounded-lg hover:opacity-95 whitespace-nowrap"
            >
              Rechercher
            </button>
          </form>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un produit..."
              className="flex-1 bg-[#F5F7FA] border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#172B4D] text-white text-sm font-medium rounded-lg"
            >
              OK
            </button>
          </form>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { label: 'Accueil', path: '/' },
              { label: 'Boutique', path: '/boutique' },
              { label: 'Nouveautés', path: '/boutique?sort=newest' },
              { label: 'Meilleures ventes', path: '/boutique?bestSeller=true' },
              { label: 'Promotions', path: '/boutique?promo=true' },
              { label: 'Suivi commande', path: '/suivi' },
              { label: 'À propos', path: '/a-propos' },
              { label: 'Contact', path: '/contact' },
              { label: 'Mon compte', path: '/compte' },
              { label: 'Administration', path: '/admin' },
            ].map((item) => (
              <button
                key={item.path + item.label}
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate(item.path);
                }}
                className="text-left px-3 py-2.5 rounded-lg bg-[#F5F7FA] text-[#172B4D] font-medium"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
