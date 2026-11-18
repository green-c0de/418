import React, { useEffect, useState } from 'react';
import { Download, Eye, FileText, Printer, Search, X } from 'lucide-react';
import {
  formatDateFR,
  formatMAD,
  ORDER_STATUS_LABELS,
  OrderStatus,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../../lib/commerce';
import { useStore } from '../../context/StoreContext';
import { downloadAuthorizedFile } from './AdminProducts';

export function AdminOrders({ token }: { token: string }) {
  const { settings, showToast } = useStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<any | null>(null);

  const [editStatus, setEditStatus] = useState('');
  const [editPayStatus, setEditPayStatus] = useState('');
  const [editTracking, setEditTracking] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setOrders(json.items || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const openOrderModal = (order: any) => {
    setSelectedOrder(order);
    setEditStatus(order.status);
    setEditPayStatus(order.paymentStatus);
    setEditTracking(order.delivery?.trackingCode || '');
    setEditNotes(order.internalNotes || '');
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: editStatus,
          paymentStatus: editPayStatus,
          trackingCode: editTracking,
          internalNotes: editNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur mise à jour');
      showToast(`Commande ${selectedOrder.orderNumber} mise à jour.`);
      setSelectedOrder(null);
      loadOrders();
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h2 className="font-display text-lg font-bold text-[#172B4D]">
            Gestion des commandes ({orders.length})
          </h2>
          <p className="text-xs text-[#252B36]/65">
            Suivez les commandes clients, modifiez les statuts, suivez les paiements et imprimez les factures.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            downloadAuthorizedFile(
              '/api/admin/orders/export',
              'commandes-librairie-amine.csv',
              token
            )
          }
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 text-xs font-semibold text-[#172B4D] rounded-lg hover:bg-[#F5F7FA]"
        >
          <Download className="w-4 h-4" /> Exporter CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 no-print">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Toutes' },
            { id: 'pending', label: 'En attente' },
            { id: 'confirmed', label: 'Confirmées' },
            { id: 'preparing', label: 'En préparation' },
            { id: 'shipped', label: 'Expédiées' },
            { id: 'delivered', label: 'Livrées' },
            { id: 'cancelled', label: 'Annulées' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === tab.id
                  ? 'bg-[#172B4D] text-white'
                  : 'bg-[#F5F7FA] text-[#252B36] hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadOrders();
          }}
          className="flex gap-2 max-w-md"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="N° commande, nom ou téléphone..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#172B4D] text-white text-xs font-semibold rounded-lg"
          >
            Rechercher
          </button>
        </form>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto no-print">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-[#F5F7FA] border-b border-slate-200 text-xs text-[#252B36]/70">
              <th className="py-3 px-4 font-medium">N° Commande</th>
              <th className="py-3 px-4 font-medium">Client</th>
              <th className="py-3 px-4 font-medium">Livraison</th>
              <th className="py-3 px-4 font-medium">Paiement</th>
              <th className="py-3 px-4 font-medium">Statut</th>
              <th className="py-3 px-4 font-medium text-right">Total</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-slate-400">
                  Chargement des commandes...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                  Aucune commande trouvée.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="hover:bg-[#F5F7FA]/50">
                  <td className="py-3 px-4">
                    <p className="font-mono-num font-bold text-[#172B4D]">{o.orderNumber}</p>
                    <p className="text-xs text-[#252B36]/60 font-mono-num">
                      {formatDateFR(o.createdAt)}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-[#252B36]">{o.customerName}</p>
                    <p className="text-xs text-[#252B36]/60">{o.customerPhone}</p>
                  </td>
                  <td className="py-3 px-4 text-xs text-[#252B36]/80">
                    <p>{o.city}</p>
                    <p className="text-[#252B36]/60">{o.deliveryMethod}</p>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <p>{PAYMENT_METHOD_LABELS[o.paymentMethod] || o.paymentMethod}</p>
                    <p
                      className={
                        o.paymentStatus === 'paid'
                          ? 'text-emerald-700 font-semibold'
                          : 'text-amber-600 font-medium'
                      }
                    >
                      {PAYMENT_STATUS_LABELS[o.paymentStatus] || o.paymentStatus}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-xs font-semibold text-[#172B4D]">
                    {ORDER_STATUS_LABELS[o.status as OrderStatus] || o.status}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-num font-bold text-[#172B4D]">
                    {formatMAD(o.totalAmount)}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                    <button
                      type="button"
                      onClick={() => openOrderModal(o)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#172B4D] bg-[#F5F7FA] hover:bg-slate-200 rounded-lg"
                    >
                      <Eye className="w-3.5 h-3.5" /> Gérer
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvoiceOrder(o)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#172B4D] border border-slate-300 hover:bg-[#F5F7FA] rounded-lg"
                      title="Facture / Bon de commande"
                    >
                      <FileText className="w-3.5 h-3.5" /> Facture
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Manage Order Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-[#172B4D]">
                  Commande {selectedOrder.orderNumber}
                </h3>
                <p className="text-xs text-[#252B36]/65">
                  Passée le {formatDateFR(selectedOrder.createdAt)} · {selectedOrder.customerName} (
                  {selectedOrder.customerPhone})
                </p>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#F5F7FA] rounded-xl p-4 text-xs space-y-1">
              <p>
                <span className="font-semibold text-[#172B4D]">Adresse :</span>{' '}
                {selectedOrder.address || 'Retrait en magasin'} — {selectedOrder.city}
              </p>
              <p>
                <span className="font-semibold text-[#172B4D]">Mode de livraison :</span>{' '}
                {selectedOrder.deliveryMethod}
              </p>
              {selectedOrder.instructions && (
                <p>
                  <span className="font-semibold text-[#172B4D]">Instructions client :</span>{' '}
                  {selectedOrder.instructions}
                </p>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F5F7FA] border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Article</th>
                    <th className="py-2 px-3 text-right">PU</th>
                    <th className="py-2 px-3 text-right">Qté</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedOrder.items || []).map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-2 px-3">
                        <p className="font-medium text-[#172B4D]">{item.productName}</p>
                        <p className="font-mono-num text-[#252B36]/60">{item.productSku || item.sku || '—'}</p>
                      </td>
                      <td className="py-2 px-3 text-right font-mono-num">
                        {formatMAD(item.unitPrice)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono-num">{item.quantity}</td>
                      <td className="py-2 px-3 text-right font-mono-num font-semibold">
                        {formatMAD(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form onSubmit={handleUpdateOrder} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#172B4D] mb-1">
                    Statut de la commande
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="pending">En attente</option>
                    <option value="confirmed">Confirmée</option>
                    <option value="preparing">En préparation</option>
                    <option value="shipped">Expédiée</option>
                    <option value="delivered">Livrée</option>
                    <option value="cancelled">Annulée (restaure le stock)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#172B4D] mb-1">
                    Statut du paiement
                  </label>
                  <select
                    value={editPayStatus}
                    onChange={(e) => setEditPayStatus(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="pending">En attente</option>
                    <option value="paid">Payé</option>
                    <option value="failed">Échoué</option>
                    <option value="refunded">Remboursé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#172B4D] mb-1">
                  Code de suivi livraison (optionnel)
                </label>
                <input
                  type="text"
                  value={editTracking}
                  onChange={(e) => setEditTracking(e.target.value)}
                  placeholder="Ex : TRK-AIT-0042"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono-num"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#172B4D] mb-1">
                  Notes internes (visibles uniquement par l’administration)
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const o = selectedOrder;
                    setSelectedOrder(null);
                    setInvoiceOrder(o);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#172B4D] underline"
                >
                  <Printer className="w-4 h-4" /> Ouvrir la facture imprimable
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    Fermer
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
                  >
                    {saving ? 'Enregistrement...' : 'Mettre à jour'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable French Invoice / Receipt Modal */}
      {invoiceOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-8 space-y-6 my-8 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 no-print">
              <h3 className="font-display font-bold text-[#172B4D]">
                Aperçu facture / bon de commande
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#172B4D] text-white text-xs font-semibold rounded-lg"
                >
                  <Printer className="w-4 h-4 text-[#F59E0B]" /> Imprimer / PDF
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceOrder(null)}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="space-y-6 text-[#252B36]">
              <div className="flex justify-between items-start gap-6 border-b border-slate-200 pb-6">
                <div>
                  <h1 className="font-display text-2xl font-bold text-[#172B4D]">
                    {settings?.general?.storeName || 'Librairie Amine'}
                  </h1>
                  <p className="text-xs text-[#252B36]/75 mt-1">
                    {settings?.general?.address || 'Aït Melloul, Maroc'}
                  </p>
                  <p className="text-xs text-[#252B36]/75">
                    Tél : {settings?.general?.phone || '—'} · E-mail :{' '}
                    {settings?.general?.email || '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider text-[#252B36]/60 font-semibold">
                    Facture / Bon de commande
                  </p>
                  <p className="font-mono-num text-lg font-bold text-[#172B4D] mt-0.5">
                    FAC-{invoiceOrder.orderNumber}
                  </p>
                  <p className="text-xs text-[#252B36]/75 font-mono-num">
                    Date : {formatDateFR(invoiceOrder.createdAt)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 text-xs bg-[#F5F7FA] p-4 rounded-xl">
                <div>
                  <p className="font-bold text-[#172B4D] mb-1">Client</p>
                  <p className="font-semibold">{invoiceOrder.customerName}</p>
                  <p>Tél : {invoiceOrder.customerPhone}</p>
                  {invoiceOrder.customerEmail && <p>E-mail : {invoiceOrder.customerEmail}</p>}
                  <p>
                    Adresse : {invoiceOrder.address || 'Retrait en librairie'} — {invoiceOrder.city}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-[#172B4D] mb-1">Détails de commande</p>
                  <p>N° Commande : {invoiceOrder.orderNumber}</p>
                  <p>Livraison : {invoiceOrder.deliveryMethod}</p>
                  <p>
                    Paiement :{' '}
                    {PAYMENT_METHOD_LABELS[invoiceOrder.paymentMethod] ||
                      invoiceOrder.paymentMethod}
                  </p>
                  <p>
                    Statut paiement :{' '}
                    {PAYMENT_STATUS_LABELS[invoiceOrder.paymentStatus] ||
                      invoiceOrder.paymentStatus}
                  </p>
                </div>
              </div>

              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#172B4D] text-[#172B4D]">
                    <th className="py-2 pr-3">Réf. SKU</th>
                    <th className="py-2 pr-3">Désignation</th>
                    <th className="py-2 px-3 text-right">Prix unitaire</th>
                    <th className="py-2 px-3 text-right">Quantité</th>
                    <th className="py-2 pl-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(invoiceOrder.items || []).map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-2.5 pr-3 font-mono-num">{item.productSku || item.sku || '—'}</td>
                      <td className="py-2.5 pr-3 font-medium">{item.productName}</td>
                      <td className="py-2.5 px-3 text-right font-mono-num">
                        {formatMAD(item.unitPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num">{item.quantity}</td>
                      <td className="py-2.5 pl-3 text-right font-mono-num font-semibold">
                        {formatMAD(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span>Sous-total</span>
                    <span className="font-mono-num">{formatMAD(invoiceOrder.subtotal)}</span>
                  </div>
                  {parseFloat(invoiceOrder.discountAmount) > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Remise ({invoiceOrder.couponCode || 'Promo'})</span>
                      <span className="font-mono-num">
                        -{formatMAD(invoiceOrder.discountAmount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Frais de livraison</span>
                    <span className="font-mono-num">
                      {parseFloat(invoiceOrder.deliveryFee) === 0
                        ? 'Gratuit (0,00 DH)'
                        : formatMAD(invoiceOrder.deliveryFee)}
                    </span>
                  </div>
                  {parseFloat(invoiceOrder.taxAmount) > 0 && (
                    <div className="flex justify-between">
                      <span>TVA</span>
                      <span className="font-mono-num">{formatMAD(invoiceOrder.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-[#172B4D] border-t border-slate-300 pt-2">
                    <span>Total TTC</span>
                    <span className="font-mono-num">{formatMAD(invoiceOrder.totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 text-[11px] text-[#252B36]/65 text-center">
                Merci pour votre confiance — {settings?.general?.storeName || 'Librairie Amine'},{' '}
                {settings?.general?.city || 'Aït Melloul'}, Maroc.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
