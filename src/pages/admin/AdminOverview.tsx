import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  Clock,
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { formatDateFR, formatMAD, ORDER_STATUS_LABELS, OrderStatus } from '../../lib/commerce';

interface OverviewData {
  kpis: {
    totalRevenue: number;
    todaySales: number;
    monthSales: number;
    totalOrders: number;
    pendingOrders: number;
    customersCount: number;
    productsCount: number;
    outOfStockCount: number;
    lowStockCount: number;
  };
  charts: {
    dailySeries: { label: string; date: string; revenue: number; orders: number }[];
    monthlySeries: { label: string; revenue: number; orders: number }[];
    categoryBreakdown: { name: string; value: number }[];
    topProducts: {
      id: number;
      name: string;
      sku: string;
      salesCount: number;
      stockQuantity: number;
      price: number;
    }[];
  };
  recentOrders: any[];
}

export function AdminOverview({
  token,
  onNavigateSection,
  onOverviewLoaded,
}: {
  token: string;
  onNavigateSection: (section: string) => void;
  onOverviewLoaded?: (notifications: any[]) => void;
}) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [hoverDayIdx, setHoverDayIdx] = useState<number | null>(null);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(`/api/admin/overview?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (onOverviewLoaded && json.notifications) {
          onOverviewLoaded(json.notifications);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [from, to]);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, idx) => (
            <div key={idx} className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const daily = data?.charts.dailySeries || [];
  const monthly = data?.charts.monthlySeries || [];
  const categories = data?.charts.categoryBreakdown || [];
  const topProducts = data?.charts.topProducts || [];

  const maxDaily = Math.max(100, ...daily.map((d) => d.revenue));
  const maxMonthly = Math.max(100, ...monthly.map((m) => m.revenue));
  const maxCategory = Math.max(100, ...categories.map((c) => c.value));

  // Build responsive SVG polyline for daily revenue
  const svgW = 560;
  const svgH = 180;
  const padX = 16;
  const padY = 18;
  const points = daily.map((d, idx) => {
    const x = padX + (idx / Math.max(1, daily.length - 1)) * (svgW - padX * 2);
    const y = svgH - padY - (d.revenue / maxDaily) * (svgH - padY * 2);
    return { x, y, ...d };
  });
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints =
    points.length > 0
      ? `${points[0].x},${svgH - padY} ${polylinePoints} ${points[points.length - 1].x},${svgH - padY}`
      : '';

  const kpiCards = [
    {
      label: 'Chiffre d’affaires total',
      value: formatMAD(kpis?.totalRevenue ?? 0),
      icon: Wallet,
      action: () => onNavigateSection('reports'),
    },
    {
      label: 'Ventes du jour',
      value: formatMAD(kpis?.todaySales ?? 0),
      icon: TrendingUp,
      action: () => onNavigateSection('orders'),
    },
    {
      label: 'Ventes du mois',
      value: formatMAD(kpis?.monthSales ?? 0),
      icon: Calendar,
      action: () => onNavigateSection('reports'),
    },
    {
      label: 'Commandes totales',
      value: String(kpis?.totalOrders ?? 0),
      icon: ShoppingBag,
      action: () => onNavigateSection('orders'),
    },
    {
      label: 'Commandes en attente',
      value: String(kpis?.pendingOrders ?? 0),
      icon: Clock,
      highlight: (kpis?.pendingOrders ?? 0) > 0 ? 'amber' : undefined,
      action: () => onNavigateSection('orders'),
    },
    {
      label: 'Clients inscrits',
      value: String(kpis?.customersCount ?? 0),
      icon: Users,
      action: () => onNavigateSection('customers'),
    },
    {
      label: 'Produits enregistrés',
      value: String(kpis?.productsCount ?? 0),
      icon: Package,
      action: () => onNavigateSection('products'),
    },
    {
      label: 'Rupture de stock',
      value: String(kpis?.outOfStockCount ?? 0),
      icon: AlertTriangle,
      highlight: (kpis?.outOfStockCount ?? 0) > 0 ? 'red' : undefined,
      action: () => onNavigateSection('inventory'),
    },
    {
      label: 'Alertes stock faible',
      value: String(kpis?.lowStockCount ?? 0),
      icon: AlertTriangle,
      highlight: (kpis?.lowStockCount ?? 0) > 0 ? 'amber' : undefined,
      action: () => onNavigateSection('inventory'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header + Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4">
        <div>
          <h2 className="font-display text-lg font-bold text-[#172B4D]">
            Vue d’ensemble commerciale
          </h2>
          <p className="text-xs text-[#252B36]/65">
            Données temps réel issues de la base PostgreSQL de Librairie Amine.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="text-xs text-[#252B36]/70">Du</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
          />
          <label className="text-xs text-[#252B36]/70">au</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
          />
          {(from || to) && (
            <button
              type="button"
              onClick={() => {
                setFrom('');
                setTo('');
              }}
              className="text-xs font-medium text-[#172B4D] underline px-2"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* 9 KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={card.action}
              className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-[#172B4D]/40 transition-colors flex items-start justify-between gap-3"
            >
              <div>
                <p className="text-xs font-medium text-[#252B36]/65">{card.label}</p>
                <p
                  className={`font-display font-mono-num text-xl sm:text-2xl font-bold mt-1.5 ${
                    card.highlight === 'red'
                      ? 'text-red-600'
                      : card.highlight === 'amber'
                        ? 'text-amber-600'
                        : 'text-[#172B4D]'
                  }`}
                >
                  {card.value}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F5F7FA] text-[#172B4D] shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Line Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-sm font-bold text-[#172B4D]">
                Ventes quotidiennes (14 derniers jours)
              </h3>
              <p className="text-xs text-[#252B36]/60">
                {hoverDayIdx !== null && points[hoverDayIdx]
                  ? `${points[hoverDayIdx].label} : ${formatMAD(points[hoverDayIdx].revenue)} (${points[hoverDayIdx].orders} commande(s))`
                  : 'Survolez un point pour afficher le détail du jour'}
              </p>
            </div>
          </div>

          <div className="w-full overflow-hidden">
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-44">
              <defs>
                <linearGradient id="dailyRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#172B4D" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#172B4D" stopOpacity="0.01" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((ratio) => (
                <line
                  key={ratio}
                  x1={padX}
                  x2={svgW - padX}
                  y1={svgH - padY - ratio * (svgH - padY * 2)}
                  y2={svgH - padY - ratio * (svgH - padY * 2)}
                  stroke="#E2E8F0"
                  strokeDasharray="3 3"
                />
              ))}
              {areaPoints && <polygon points={areaPoints} fill="url(#dailyRevGrad)" />}
              {polylinePoints && (
                <polyline
                  fill="none"
                  stroke="#172B4D"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={polylinePoints}
                />
              )}
              {points.map((pt, idx) => (
                <g key={pt.date}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoverDayIdx === idx ? 5.5 : 3.5}
                    fill={hoverDayIdx === idx ? '#F59E0B' : '#172B4D'}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverDayIdx(idx)}
                    onMouseLeave={() => setHoverDayIdx(null)}
                  />
                </g>
              ))}
            </svg>
            <div className="flex justify-between text-[11px] text-[#252B36]/55 font-mono-num px-2">
              <span>{daily[0]?.label}</span>
              <span>{daily[Math.floor(daily.length / 2)]?.label}</span>
              <span>{daily[daily.length - 1]?.label}</span>
            </div>
          </div>
        </div>

        {/* Monthly Revenue Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-display text-sm font-bold text-[#172B4D] mb-1">
            Chiffre d’affaires mensuel (6 derniers mois)
          </h3>
          <p className="text-xs text-[#252B36]/60 mb-5">
            Hors commandes annulées
          </p>
          <div className="h-44 flex items-end justify-between gap-3 pt-4">
            {monthly.map((m) => {
              const heightPct = Math.max(6, Math.round((m.revenue / maxMonthly) * 100));
              return (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[11px] font-mono-num text-[#172B4D] font-semibold">
                    {m.revenue > 0 ? Math.round(m.revenue) : '0'}
                  </span>
                  <div className="w-full max-w-[44px] bg-[#F5F7FA] rounded-t-lg h-full flex items-end overflow-hidden">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-[#172B4D] hover:bg-[#F59E0B] transition-colors rounded-t-lg"
                      title={`${m.label} : ${formatMAD(m.revenue)} (${m.orders} commandes)`}
                    />
                  </div>
                  <span className="text-[11px] text-[#252B36]/70 capitalize">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Category Breakdown & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-display text-sm font-bold text-[#172B4D] mb-4">
            Ventes par catégorie
          </h3>
          {categories.length === 0 ? (
            <p className="text-sm text-[#252B36]/60">Aucune donnée de vente par catégorie pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {categories.map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#252B36] truncate">{cat.name}</span>
                    <span className="font-mono-num font-semibold text-[#172B4D]">
                      {formatMAD(cat.value)}
                    </span>
                  </div>
                  <div className="h-2 bg-[#F5F7FA] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.max(4, (cat.value / maxCategory) * 100)}%` }}
                      className="h-full bg-[#F59E0B] rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-bold text-[#172B4D]">
              Produits les plus vendus
            </h3>
            <button
              type="button"
              onClick={() => onNavigateSection('products')}
              className="text-xs font-semibold text-[#172B4D] hover:underline inline-flex items-center gap-1"
            >
              Gérer <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {topProducts.map((p) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-[#172B4D] truncate">{p.name}</p>
                  <p className="text-xs text-[#252B36]/60 font-mono-num">
                    {p.sku} · Stock : {p.stockQuantity}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono-num font-semibold text-[#172B4D]">
                    {p.salesCount} vendu(s)
                  </p>
                  <p className="text-xs text-[#252B36]/60 font-mono-num">{formatMAD(p.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-bold text-[#172B4D]">
            Commandes récentes
          </h3>
          <button
            type="button"
            onClick={() => onNavigateSection('orders')}
            className="text-xs font-semibold text-[#172B4D] hover:underline inline-flex items-center gap-1"
          >
            Toutes les commandes <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-[#252B36]/60">
                <th className="py-2 pr-4 font-medium">N° Commande</th>
                <th className="py-2 pr-4 font-medium">Client</th>
                <th className="py-2 pr-4 font-medium">Ville</th>
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Statut</th>
                <th className="py-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.recentOrders || []).map((o) => (
                <tr key={o.id} className="hover:bg-[#F5F7FA]/60">
                  <td className="py-2.5 pr-4 font-mono-num font-semibold text-[#172B4D]">
                    {o.orderNumber}
                  </td>
                  <td className="py-2.5 pr-4">
                    <p className="font-medium text-[#252B36]">{o.customerName}</p>
                    <p className="text-xs text-[#252B36]/60">{o.customerPhone}</p>
                  </td>
                  <td className="py-2.5 pr-4 text-[#252B36]/80">{o.city}</td>
                  <td className="py-2.5 pr-4 font-mono-num text-xs text-[#252B36]/70">
                    {formatDateFR(o.createdAt)}
                  </td>
                  <td className="py-2.5 pr-4 text-xs font-semibold text-[#172B4D]">
                    {ORDER_STATUS_LABELS[o.status as OrderStatus] || o.status}
                  </td>
                  <td className="py-2.5 text-right font-mono-num font-semibold text-[#172B4D]">
                    {formatMAD(o.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
