import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { QuickViewModal } from './components/QuickViewModal';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartCheckoutPage } from './pages/CartCheckoutPage';
import { AccountPage } from './pages/AccountPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { AboutPage, ContactPage, LegalPage } from './pages/AboutContactPages';
import { AdminLayout } from './pages/admin/AdminLayout';

function AppShell() {
  const { pathname, navigate, toast } = useStore();
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const handler = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const isAdminRoute = normalizedPath === '/admin' || normalizedPath.startsWith('/admin/');

  const renderPage = () => {
    if (normalizedPath === '/') return <HomePage />;
    if (normalizedPath === '/boutique') return <ShopPage />;
    if (normalizedPath.startsWith('/produit/')) {
      const slug = decodeURIComponent(normalizedPath.slice('/produit/'.length));
      return <ProductDetailPage slug={slug} />;
    }
    if (normalizedPath === '/panier') return <CartCheckoutPage mode="cart" />;
    if (normalizedPath === '/commander') return <CartCheckoutPage mode="checkout" />;
    if (normalizedPath === '/compte') return <AccountPage />;
    if (normalizedPath === '/suivi') return <OrderTrackingPage />;
    if (normalizedPath === '/a-propos') return <AboutPage />;
    if (normalizedPath === '/contact') return <ContactPage />;
    if (normalizedPath === '/cgv') return <LegalPage type="cgv" />;
    if (normalizedPath === '/confidentialite') return <LegalPage type="confidentialite" />;
    if (normalizedPath === '/livraison') return <LegalPage type="livraison" />;
    if (normalizedPath === '/retour') return <LegalPage type="retour" />;

    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-3xl font-bold text-[#172B4D]">Page introuvable</h1>
        <p className="text-sm text-[#252B36]/75">
          La page demandée n’existe pas ou a été déplacée.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
        >
          Retour à l’accueil
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#252B36]">
      {/* Google Maps Platform Case A Quota Warning Banner */}
      {mapsQuotaExceeded && (
        <div
          role="alert"
          className="sticky top-0 z-50 bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs sm:text-sm flex items-center justify-between gap-3 no-print"
        >
          <div className="flex items-center gap-2 max-w-7xl mx-auto">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Quota de démonstration Google Maps atteint ou clé restreinte. Vous pouvez consulter l’itinéraire directement sur Google Maps.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMapsQuotaExceeded(false)}
            aria-label="Fermer l'alerte"
            className="text-amber-700 hover:text-amber-950 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isAdminRoute ? (
        <AdminLayout />
      ) : (
        <>
          <Header />
          <main className="flex-1">{renderPage()}</main>
          <Footer />
          <CartDrawer />
          <QuickViewModal />
        </>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 bg-[#172B4D] text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg border border-white/10 max-w-sm no-print"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}
