import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  Plus,
  Printer,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { formatDateFR, formatMAD } from '../../lib/commerce';
import { useStore } from '../../context/StoreContext';
import { downloadAuthorizedFile, uploadImageFile } from './AdminProducts';

export function AdminSettingsAndMarketing({
  token,
  activeSection,
}: {
  token: string;
  activeSection: 'marketing' | 'reviews' | 'reports' | 'settings';
}) {
  const { settings, refreshStorefront, showToast } = useStore();

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Marketing state
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newsletters, setNewsletters] = useState<any[]>([]);
  const [couponModal, setCouponModal] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '10',
    minPurchase: '0',
    maxUses: '',
    expiresAt: '',
    description: '',
    isActive: true,
  });

  // Reviews & Messages
  const [reviews, setReviews] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  // Reports
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportData, setReportData] = useState<any | null>(null);

  // Settings
  const [settingsTab, setSettingsTab] = useState<
    'general' | 'branding' | 'currency_tax' | 'notifications' | 'homepage' | 'about' | 'seo' | 'security'
  >('general');
  const [localSettings, setLocalSettings] = useState<any>(settings || {});
  const [securityData, setSecurityData] = useState<{ logs: any[]; admins: any[] }>({
    logs: [],
    admins: [],
  });
  const [newAdmin, setNewAdmin] = useState({ email: '', fullName: '', password: '' });

  useEffect(() => {
    if (settings) {
      setLocalSettings(JSON.parse(JSON.stringify(settings)));
    }
  }, [settings]);

  const loadSection = async () => {
    if (activeSection === 'marketing') {
      const res = await fetch('/api/admin/marketing', { headers });
      if (res.ok) {
        const json = await res.json();
        setCoupons(json.coupons || []);
        setNewsletters(json.newsletters || []);
      }
    } else if (activeSection === 'reviews') {
      const res = await fetch('/api/admin/reviews', { headers });
      if (res.ok) {
        const json = await res.json();
        setReviews(json.reviews || []);
        setMessages(json.messages || []);
      }
    } else if (activeSection === 'reports') {
      const params = new URLSearchParams();
      if (reportFrom) params.set('from', reportFrom);
      if (reportTo) params.set('to', reportTo);
      const res = await fetch(`/api/admin/reports?${params.toString()}`, { headers });
      if (res.ok) setReportData(await res.json());
    } else if (activeSection === 'settings') {
      const [sRes, secRes] = await Promise.all([
        fetch('/api/admin/settings', { headers }),
        fetch('/api/admin/security', { headers }),
      ]);
      if (sRes.ok) setLocalSettings((await sRes.json()).settings);
      if (secRes.ok) setSecurityData(await secRes.json());
    }
  };

  useEffect(() => {
    loadSection();
  }, [activeSection, reportFrom, reportTo]);

  const saveSettingsKey = async (key: string, value: any) => {
    const res = await fetch(`/api/admin/settings/${key}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(value),
    });
    if (res.ok) {
      showToast('Paramètres enregistrés avec succès.');
      await refreshStorefront();
    } else {
      showToast('Erreur lors de la sauvegarde.');
    }
  };

  // 1. MARKETING & COUPONS
  if (activeSection === 'marketing') {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[#172B4D]">
              Promotions, codes promo et newsletter
            </h2>
            <p className="text-xs text-[#252B36]/65">
              Créez des codes de réduction et consultez vos abonnés à la newsletter.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCouponModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#172B4D] text-white text-xs font-semibold rounded-lg"
          >
            <Plus className="w-4 h-4 text-[#F59E0B]" /> Nouveau code promo
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-[#F5F7FA] border-b border-slate-200 text-xs text-[#252B36]/70">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Remise</th>
                <th className="py-3 px-4">Min. achat</th>
                <th className="py-3 px-4">Utilisations</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 px-4 font-mono-num font-bold text-[#172B4D]">{c.code}</td>
                  <td className="py-3 px-4 font-mono-num">
                    {c.discountType === 'percentage'
                      ? `${c.discountValue}%`
                      : formatMAD(c.discountValue)}
                  </td>
                  <td className="py-3 px-4 font-mono-num text-xs">
                    {formatMAD(c.minPurchase)}
                  </td>
                  <td className="py-3 px-4 font-mono-num text-xs">
                    {c.usedCount} / {c.maxUses ?? '∞'}
                  </td>
                  <td className="py-3 px-4 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/coupons/${c.id}`, {
                          method: 'PUT',
                          headers,
                          body: JSON.stringify({ isActive: !c.isActive }),
                        });
                        loadSection();
                      }}
                      className={c.isActive ? 'text-emerald-700 underline' : 'text-slate-400 underline'}
                    >
                      {c.isActive ? 'Actif' : 'Désactivé'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/coupons/${c.id}`, {
                          method: 'DELETE',
                          headers,
                        });
                        showToast('Code supprimé.');
                        loadSection();
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-bold text-[#172B4D]">
              Abonnés à la newsletter ({newsletters.length})
            </h3>
            {newsletters.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const csv =
                    'email;date_inscription\n' +
                    newsletters
                      .map((n) => `${n.email};${formatDateFR(n.createdAt)}`)
                      .join('\n');
                  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'abonnes-newsletter.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-xs font-semibold text-[#172B4D] underline"
              >
                Exporter CSV
              </button>
            )}
          </div>
          {newsletters.length === 0 ? (
            <p className="text-xs text-[#252B36]/60">Aucun abonné enregistré pour le moment.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              {newsletters.map((n) => (
                <div
                  key={n.id}
                  className="bg-[#F5F7FA] px-3 py-2 rounded-lg flex justify-between items-center"
                >
                  <span className="truncate font-medium text-[#172B4D]">{n.email}</span>
                  <span className="font-mono-num text-[#252B36]/60 shrink-0 ml-2">
                    {formatDateFR(n.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {couponModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await fetch('/api/admin/coupons', {
                  method: 'POST',
                  headers,
                  body: JSON.stringify(couponForm),
                });
                const json = await res.json();
                if (res.ok) {
                  showToast('Code promo créé.');
                  setCouponModal(false);
                  loadSection();
                } else {
                  showToast(json.error || 'Erreur');
                }
              }}
              className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-[#172B4D]">Nouveau code promo</h3>
                <button type="button" onClick={() => setCouponModal(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="Code (ex: RENTREE15)"
                value={couponForm.code}
                onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono-num uppercase"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={couponForm.discountType}
                  onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="percentage">Pourcentage (%)</option>
                  <option value="fixed">Montant fixe (DH)</option>
                </select>
                <input
                  type="number"
                  required
                  min="1"
                  value={couponForm.discountValue}
                  onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono-num"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#252B36]/70">Minimum achat (DH)</label>
                  <input
                    type="number"
                    min="0"
                    value={couponForm.minPurchase}
                    onChange={(e) => setCouponForm({ ...couponForm, minPurchase: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono-num"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#252B36]/70">Date d’expiration</label>
                  <input
                    type="date"
                    value={couponForm.expiresAt}
                    onChange={(e) => setCouponForm({ ...couponForm, expiresAt: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <input
                type="text"
                placeholder="Description"
                value={couponForm.description}
                onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCouponModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // 2. REVIEWS & CONTACT MESSAGES
  if (activeSection === 'reviews') {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="font-display text-lg font-bold text-[#172B4D]">
            Avis clients & messages de contact
          </h2>
          <p className="text-xs text-[#252B36]/65">
            Modérez les avis produits, choisissez les témoignages affichés sur l’accueil et consultez les messages reçus.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="font-display text-sm font-bold text-[#172B4D]">
            Avis et témoignages ({reviews.length})
          </h3>
          <div className="divide-y divide-slate-100">
            {reviews.map((r) => (
              <div key={r.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#172B4D]">
                    {r.authorName} ({r.rating}/5) {r.isSample ? '· Exemple démo' : ''}
                  </p>
                  <p className="text-xs text-[#252B36]/80 mt-0.5">{r.comment}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/admin/reviews/${r.id}`, {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify({ isApproved: !r.isApproved }),
                      });
                      loadSection();
                      refreshStorefront();
                    }}
                    className={`px-3 py-1.5 rounded-lg font-semibold ${
                      r.isApproved ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {r.isApproved ? 'Approuvé' : 'Masqué'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/admin/reviews/${r.id}`, {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify({ isStoreTestimonial: !r.isStoreTestimonial }),
                      });
                      loadSection();
                      refreshStorefront();
                    }}
                    className={`px-3 py-1.5 rounded-lg font-semibold ${
                      r.isStoreTestimonial
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-[#F5F7FA] text-[#252B36]'
                    }`}
                  >
                    {r.isStoreTestimonial ? 'Sur l’accueil' : 'Afficher accueil'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/admin/reviews/${r.id}`, {
                        method: 'DELETE',
                        headers,
                      });
                      loadSection();
                      refreshStorefront();
                    }}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="font-display text-sm font-bold text-[#172B4D]">
            Messages du formulaire de contact ({messages.length})
          </h3>
          {messages.length === 0 ? (
            <p className="text-xs text-[#252B36]/60">Aucun message reçu.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-sm">
              {messages.map((m) => (
                <div key={m.id} className="py-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-[#172B4D]">
                      {m.name} ({m.email} · {m.phone})
                    </span>
                    <span className="font-mono-num text-[#252B36]/60">
                      {formatDateFR(m.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#172B4D]">{m.subject}</p>
                  <p className="text-xs text-[#252B36]/80">{m.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. REPORTS
  if (activeSection === 'reports') {
    const sum = reportData?.summary;
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 no-print">
          <div>
            <h2 className="font-display text-lg font-bold text-[#172B4D]">
              Rapports et statistiques
            </h2>
            <p className="text-xs text-[#252B36]/65">
              Synthèse financière, valorisation du stock et exportation comptable.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={reportFrom}
              onChange={(e) => setReportFrom(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
            />
            <input
              type="date"
              value={reportTo}
              onChange={(e) => setReportTo(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#172B4D] text-white text-xs font-semibold rounded-lg"
            >
              <Printer className="w-4 h-4 text-[#F59E0B]" /> Imprimer / PDF
            </button>
            <button
              type="button"
              onClick={() =>
                downloadAuthorizedFile(
                  '/api/admin/orders/export',
                  'rapport-commandes-librairie-amine.csv',
                  token
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 text-xs font-semibold text-[#172B4D] rounded-lg"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {sum && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Chiffre d’affaires validé', val: formatMAD(sum.revenue) },
              { label: 'Panier moyen', val: formatMAD(sum.averageBasket) },
              { label: 'Remises accordées', val: formatMAD(sum.discounts) },
              { label: 'Valeur du stock (coût)', val: formatMAD(sum.stockValuation) },
              { label: 'Commandes totales', val: String(sum.ordersTotal) },
              { label: 'Commandes valides', val: String(sum.ordersCompleted) },
              { label: 'Commandes annulées', val: String(sum.ordersCancelled) },
              { label: 'Frais de livraison facturés', val: formatMAD(sum.deliveryFees) },
            ].map((item) => (
              <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-[#252B36]/65">{item.label}</p>
                <p className="font-display font-mono-num text-xl font-bold text-[#172B4D] mt-1">
                  {item.val}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 4. SETTINGS
  const general = localSettings.general || {};
  const branding = localSettings.branding || {};
  const currency = localSettings.currency || {};
  const tax = localSettings.tax || {};
  const notifs = localSettings.notifications || {};
  const homepage = localSettings.homepage || {};
  const about = localSettings.about || {};
  const seo = localSettings.seo || {};

  const moveHomeSection = (idx: number, dir: -1 | 1) => {
    const order = [...(homepage.sectionsOrder || [])];
    const target = idx + dir;
    if (target < 0 || target >= order.length) return;
    [order[idx], order[target]] = [order[target], order[idx]];
    setLocalSettings({
      ...localSettings,
      homepage: { ...homepage, sectionsOrder: order },
    });
  };

  const SECTION_NAMES_FR: Record<string, string> = {
    hero: 'Bannière principale (Hero)',
    categories: 'Catégories de produits',
    bestSellers: 'Meilleures ventes',
    newArrivals: 'Nouveautés',
    specialOffers: 'Offres spéciales et promotions',
    whyChooseUs: 'Pourquoi choisir Librairie Amine ?',
    reviews: 'Avis et témoignages clients',
    newsletter: 'Inscription à la newsletter',
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="font-display text-lg font-bold text-[#172B4D]">
          Paramètres complets du site
        </h2>
        <p className="text-xs text-[#252B36]/65">
          Modifiez toutes les informations, l’identité visuelle, la page d’accueil, la page À propos, le SEO et la sécurité.
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          {[
            { id: 'general', label: 'Général & Coordonnées' },
            { id: 'branding', label: 'Logo & Couleurs' },
            { id: 'currency_tax', label: 'Devise & Taxes' },
            { id: 'notifications', label: 'Notifications' },
            { id: 'homepage', label: 'Page d’accueil' },
            { id: 'about', label: 'Page À propos' },
            { id: 'seo', label: 'SEO' },
            { id: 'security', label: 'Sécurité & Sauvegarde' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSettingsTab(t.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                settingsTab === t.id
                  ? 'bg-[#172B4D] text-white'
                  : 'bg-[#F5F7FA] text-[#252B36] hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB: GENERAL */}
      {settingsTab === 'general' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {[
              { k: 'storeName', label: 'Nom de la boutique' },
              { k: 'tagline', label: 'Slogan' },
              { k: 'address', label: 'Adresse complète' },
              { k: 'city', label: 'Ville' },
              { k: 'phone', label: 'Téléphone' },
              { k: 'whatsapp', label: 'WhatsApp' },
              { k: 'email', label: 'E-mail de contact' },
              { k: 'openingHours', label: 'Horaires d’ouverture' },
              { k: 'socialFacebook', label: 'Lien Facebook' },
              { k: 'socialInstagram', label: 'Lien Instagram' },
            ].map((f) => (
              <div key={f.k}>
                <label className="block text-xs font-medium text-[#172B4D] mb-1">{f.label}</label>
                <input
                  type="text"
                  value={general[f.k] || ''}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      general: { ...general, [f.k]: e.target.value },
                    })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => saveSettingsKey('general', localSettings.general)}
            className="px-5 py-2.5 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
          >
            Enregistrer les coordonnées
          </button>
        </div>
      )}

      {/* TAB: BRANDING & LOGO */}
      {settingsTab === 'branding' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#172B4D] mb-1">
              Logo officiel (URL ou téléversement)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={general.logoUrl || ''}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    general: { ...general, logoUrl: e.target.value },
                  })
                }
                placeholder="Laisser vide pour le logo typographique"
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <label className="px-3 py-2 bg-[#F5F7FA] border border-slate-300 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" /> Téléverser logo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await uploadImageFile(file, token);
                    setLocalSettings({
                      ...localSettings,
                      general: { ...general, logoUrl: url },
                    });
                  }}
                />
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#172B4D] mb-1">
                Couleur principale (#172B4D par défaut)
              </label>
              <input
                type="color"
                value={branding.primaryColor || '#172B4D'}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    branding: { ...branding, primaryColor: e.target.value },
                  })
                }
                className="h-10 w-24 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#172B4D] mb-1">
                Couleur secondaire (#F59E0B par défaut)
              </label>
              <input
                type="color"
                value={branding.secondaryColor || '#F59E0B'}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    branding: { ...branding, secondaryColor: e.target.value },
                  })
                }
                className="h-10 w-24 border border-slate-300 rounded"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await saveSettingsKey('general', localSettings.general);
              await saveSettingsKey('branding', localSettings.branding);
            }}
            className="px-5 py-2.5 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
          >
            Enregistrer l’identité visuelle
          </button>
        </div>
      )}

      {/* TAB: CURRENCY & TAX */}
      {settingsTab === 'currency_tax' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#172B4D] mb-1">Code devise</label>
              <input
                type="text"
                value={currency.code || 'MAD'}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    currency: { ...currency, code: e.target.value },
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#172B4D] mb-1">Symbole affiché</label>
              <input
                type="text"
                value={currency.symbol || 'DH'}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    currency: { ...currency, symbol: e.target.value },
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#172B4D] mb-1">Taux TVA (%)</label>
              <input
                type="number"
                value={tax.ratePercent ?? 20}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    tax: { ...tax, ratePercent: Number(e.target.value) },
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono-num"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(tax.enabled)}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  tax: { ...tax, enabled: e.target.checked },
                })
              }
            />
            Ajouter la TVA en supplément sur les commandes (si décoché, les prix sont TTC)
          </label>
          <button
            type="button"
            onClick={async () => {
              await saveSettingsKey('currency', localSettings.currency);
              await saveSettingsKey('tax', localSettings.tax);
            }}
            className="px-5 py-2.5 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
          >
            Enregistrer devise et taxes
          </button>
        </div>
      )}

      {/* TAB: NOTIFICATIONS */}
      {settingsTab === 'notifications' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 text-sm">
          {[
            { k: 'emailOnNewOrder', label: 'Alerte nouvelle commande client' },
            { k: 'lowStockAlert', label: 'Alerte stock faible lors des commandes' },
            { k: 'customerOrderConfirmation', label: 'Confirmation automatique de commande client' },
            { k: 'adminOrderAlert', label: 'Notification dans le tableau de bord administrateur' },
          ].map((item) => (
            <label key={item.k} className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={Boolean(notifs[item.k])}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    notifications: { ...notifs, [item.k]: e.target.checked },
                  })
                }
              />
              {item.label}
            </label>
          ))}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => saveSettingsKey('notifications', localSettings.notifications)}
              className="px-5 py-2.5 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
            >
              Enregistrer les préférences
            </button>
          </div>
        </div>
      )}

      {/* TAB: HOMEPAGE EDITOR */}
      {settingsTab === 'homepage' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-[#172B4D]">
              <input
                type="checkbox"
                checked={homepage.announcementEnabled !== false}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    homepage: { ...homepage, announcementEnabled: e.target.checked },
                  })
                }
              />
              Afficher la barre d’annonce en haut du site
            </label>
            <input
              type="text"
              value={homepage.announcementText || ''}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  homepage: { ...homepage, announcementText: e.target.value },
                })
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#172B4D] mb-1">
                Titre principal (Hero)
              </label>
              <input
                type="text"
                value={homepage.heroHeadline || ''}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    homepage: { ...homepage, heroHeadline: e.target.value },
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#172B4D] mb-1">
                Sous-titre (Hero)
              </label>
              <textarea
                rows={2}
                value={homepage.heroSubtitle || ''}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    homepage: { ...homepage, heroSubtitle: e.target.value },
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#172B4D] mb-1">
                Image bannière Hero
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={homepage.heroImage || ''}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      homepage: { ...homepage, heroImage: e.target.value },
                    })
                  }
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
                <label className="px-3 py-2 bg-[#F5F7FA] border border-slate-300 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" /> Importer
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = await uploadImageFile(f, token);
                      setLocalSettings({
                        ...localSettings,
                        homepage: { ...homepage, heroImage: url },
                      });
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-[#172B4D]">
              Ordre et visibilité des sections de la page d’accueil
            </p>
            {(homepage.sectionsOrder || []).map((key: string, idx: number) => (
              <div
                key={key}
                className="flex items-center justify-between bg-[#F5F7FA] px-3 py-2 rounded-lg text-sm"
              >
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={homepage.visibleSections?.[key] !== false}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        homepage: {
                          ...homepage,
                          visibleSections: {
                            ...(homepage.visibleSections || {}),
                            [key]: e.target.checked,
                          },
                        },
                      })
                    }
                  />
                  <span>{SECTION_NAMES_FR[key] || key}</span>
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveHomeSection(idx, -1)}
                    className="p-1 hover:bg-slate-200 rounded"
                    title="Monter"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveHomeSection(idx, 1)}
                    className="p-1 hover:bg-slate-200 rounded"
                    title="Descendre"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => saveSettingsKey('homepage', localSettings.homepage)}
            className="px-5 py-2.5 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
          >
            Enregistrer la page d’accueil
          </button>
        </div>
      )}

      {/* TAB: ABOUT */}
      {settingsTab === 'about' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          {[
            { k: 'intro', label: 'Introduction' },
            { k: 'history', label: 'Histoire de la librairie' },
            { k: 'mission', label: 'Notre mission' },
            { k: 'values', label: 'Nos valeurs' },
            { k: 'commitment', label: 'Engagement local (Aït Melloul)' },
          ].map((f) => (
            <div key={f.k}>
              <label className="block text-xs font-medium text-[#172B4D] mb-1">{f.label}</label>
              <textarea
                rows={2}
                value={about[f.k] || ''}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    about: { ...about, [f.k]: e.target.value },
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => saveSettingsKey('about', localSettings.about)}
            className="px-5 py-2.5 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
          >
            Enregistrer la page À propos
          </button>
        </div>
      )}

      {/* TAB: SEO */}
      {settingsTab === 'seo' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#172B4D] mb-1">
              Titre du site (balise title)
            </label>
            <input
              type="text"
              value={seo.siteTitle || ''}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  seo: { ...seo, siteTitle: e.target.value },
                })
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#172B4D] mb-1">
              Meta description
            </label>
            <textarea
              rows={3}
              value={seo.metaDescription || ''}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  seo: { ...seo, metaDescription: e.target.value },
                })
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => saveSettingsKey('seo', localSettings.seo)}
            className="px-5 py-2.5 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
          >
            Enregistrer le SEO
          </button>
        </div>
      )}

      {/* TAB: SECURITY & BACKUP */}
      {settingsTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-sm font-bold text-[#172B4D]">
                Sauvegarde de la base de données
              </h3>
              <p className="text-xs text-[#252B36]/65">
                Téléchargez une archive JSON complète des produits, catégories, commandes et paramètres.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                downloadAuthorizedFile(
                  '/api/admin/backup',
                  `sauvegarde-librairie-amine-${new Date().toISOString().slice(0, 10)}.json`,
                  token
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#172B4D] text-white text-xs font-semibold rounded-lg"
            >
              <Download className="w-4 h-4 text-[#F59E0B]" /> Télécharger une sauvegarde JSON
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="font-display text-sm font-bold text-[#172B4D]">
              Comptes administrateurs ({securityData.admins.length})
            </h3>
            <div className="space-y-2 text-xs">
              {securityData.admins.map((a) => (
                <div
                  key={a.id}
                  className="flex justify-between items-center bg-[#F5F7FA] px-3 py-2 rounded-lg"
                >
                  <span>
                    <strong className="text-[#172B4D]">{a.fullName}</strong> · {a.email}
                  </span>
                  <span className="font-mono-num text-[#252B36]/60">
                    Créé le {formatDateFR(a.createdAt)}
                  </span>
                </div>
              ))}
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await fetch('/api/admin/security/admin-users', {
                  method: 'POST',
                  headers,
                  body: JSON.stringify(newAdmin),
                });
                const json = await res.json();
                if (res.ok) {
                  showToast('Administrateur ajouté ou mis à jour.');
                  setNewAdmin({ email: '', fullName: '', password: '' });
                  loadSection();
                } else {
                  showToast(json.error || 'Erreur');
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2"
            >
              <input
                type="text"
                placeholder="Nom complet"
                value={newAdmin.fullName}
                onChange={(e) => setNewAdmin({ ...newAdmin, fullName: e.target.value })}
                className="border border-slate-300 rounded-lg px-3 py-2 text-xs"
              />
              <input
                type="email"
                required
                placeholder="E-mail *"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                className="border border-slate-300 rounded-lg px-3 py-2 text-xs"
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Mot de passe (8+ car.) *"
                value={newAdmin.password}
                onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                className="border border-slate-300 rounded-lg px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#172B4D] text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Créer / Mettre à jour
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h3 className="font-display text-sm font-bold text-[#172B4D]">
              Journal d’activité administrateur
            </h3>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
              {securityData.logs.map((log) => (
                <div key={log.id} className="py-2 flex justify-between gap-3">
                  <div>
                    <span className="font-semibold text-[#172B4D]">{log.action}</span>
                    {log.details && (
                      <span className="text-[#252B36]/75"> — {log.details}</span>
                    )}
                    <span className="block text-[#252B36]/55">{log.adminEmail}</span>
                  </div>
                  <span className="font-mono-num text-[#252B36]/60 shrink-0">
                    {formatDateFR(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
