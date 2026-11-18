import React, { useState } from 'react';
import {
  BarChart3,
  Bell,
  Boxes,
  CreditCard,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Settings,
  ShoppingCart,
  Tag,
  Tags,
  Truck,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { AdminLogin } from './AdminLogin';
import { AdminOverview } from './AdminOverview';
import { AdminProducts } from './AdminProducts';
import { AdminOrders } from './AdminOrders';
import { AdminOperations } from './AdminOperations';
import { AdminSettingsAndMarketing } from './AdminSettingsAndMarketing';

type AdminSection =
  | 'overview'
  | 'products'
  | 'categories'
  | 'brands'
  | 'orders'
  | 'customers'
  | 'inventory'
  | 'suppliers'
  | 'delivery'
  | 'payments'
  | 'marketing'
  | 'reviews'
  | 'reports'
  | 'settings';

const NAV_ITEMS: { id: AdminSection; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'overview', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'products', label: 'Produits', icon: Package },
  { id: 'categories', label: 'Catégories', icon: FolderTree },
  { id: 'brands', label: 'Marques', icon: Tag },
  { id: 'orders', label: 'Commandes', icon: ShoppingCart },
  { id: 'customers', label: 'Clients', icon: Users },
  { id: 'inventory', label: 'Gestion du stock', icon: Boxes },
  { id: 'suppliers', label: 'Fournisseurs', icon: Warehouse },
  { id: 'delivery', label: 'Livraisons', icon: Truck },
  { id: 'payments', label: 'Paiements', icon: CreditCard },
  { id: 'marketing', label: 'Promotions', icon: Tags },
  { id: 'reviews', label: 'Avis clients', icon: MessageSquare },
  { id: 'reports', label: 'Rapports et statistiques', icon: BarChart3 },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];

export function AdminLayout() {
  const { user, token, logout, navigate } = useStore();
  const [section, setSection] = useState<AdminSection>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  if (!token || !user || user.role !== 'admin') {
    return <AdminLogin />;
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const activeLabel = NAV_ITEMS.find((i) => i.id === section)?.label || 'Tableau de bord';

  const markNotificationsRead = async () => {
    await fetch('/api/admin/notifications/read-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#172B4D] text-white">
      <div className="px-5 py-5 border-b border-white/10">
        <p className="font-display text-lg font-bold tracking-tight">Librairie Amine</p>
        <p className="text-xs text-white/65 mt-0.5">Administration · Aït Melloul</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSection(item.id);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                active
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#F59E0B]' : ''}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-1.5">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-white/80 hover:bg-white/10"
        >
          <ExternalLink className="w-4 h-4 text-[#F59E0B]" />
          Voir la boutique en ligne
        </button>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-white/75 hover:bg-white/10"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen no-print">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div className="w-72 max-w-[85vw] h-full">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 px-4 sm:px-6 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden p-2 -ml-2 text-[#172B4D] hover:bg-slate-100 rounded-lg"
              aria-label="Menu administration"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <p className="text-[11px] text-[#252B36]/55">Administration</p>
              <h1 className="font-display text-base sm:text-lg font-bold text-[#172B4D]">
                {activeLabel}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative p-2 text-[#172B4D] hover:bg-[#F5F7FA] rounded-lg"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-[#F59E0B] text-white rounded-full flex items-center justify-center font-mono-num">
                  {unreadCount}
                </span>
              )}
            </button>

            <div className="hidden sm:block text-right text-xs">
              <p className="font-semibold text-[#172B4D]">{user.fullName}</p>
              <p className="text-[#252B36]/60">{user.email}</p>
            </div>

            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-[#172B4D]">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markNotificationsRead}
                      className="text-[11px] text-[#172B4D] underline"
                    >
                      Tout marquer lu
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 mt-1">
                  {notifications.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-500">
                      Aucune notification récente.
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="py-2 text-xs">
                        <p className="font-semibold text-[#172B4D]">{n.title}</p>
                        <p className="text-[#252B36]/75">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {section === 'overview' && (
            <AdminOverview
              token={token}
              onNavigateSection={(s) => setSection(s as AdminSection)}
              onOverviewLoaded={setNotifications}
            />
          )}
          {(section === 'products' || section === 'categories' || section === 'brands') && (
            <AdminProducts token={token} activeSection={section} />
          )}
          {section === 'orders' && <AdminOrders token={token} />}
          {(section === 'customers' ||
            section === 'inventory' ||
            section === 'suppliers' ||
            section === 'delivery' ||
            section === 'payments') && <AdminOperations token={token} activeSection={section} />}
          {(section === 'marketing' ||
            section === 'reviews' ||
            section === 'reports' ||
            section === 'settings') && (
            <AdminSettingsAndMarketing token={token} activeSection={section} />
          )}
        </main>
      </div>
    </div>
  );
}
