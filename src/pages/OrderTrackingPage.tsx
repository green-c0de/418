import React, { useEffect, useState } from 'react';
import { CheckCircle2, Package, Search, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatDateFR, formatMAD, ORDER_STATUS_LABELS, OrderStatus } from '../lib/commerce';

const STEPS: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];

export function OrderTrackingPage() {
  const { searchQuery, token } = useStore();
  const urlParams = new URLSearchParams(searchQuery);
  const initialOrder = urlParams.get('orderNumber') || '';
  const initialPhone = urlParams.get('phone') || '';

  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [phone, setPhone] = useState(initialPhone);
  const [result, setResult] = useState<{ order: any; items: any[]; delivery: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runLookup = async (ordNum: string, tel: string) => {
    if (!ordNum.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ orderNumber: ordNum.trim(), phone: tel.trim() });
      const res = await fetch(`/api/orders/track?${q.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Commande introuvable');
      setResult(data);
    } catch (err: any) {
      setResult(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrder && (token || initialPhone)) {
      runLookup(initialOrder, initialPhone);
    }
  }, [initialOrder, initialPhone, token]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runLookup(orderNumber, phone);
  };

  const currentIdx = result ? STEPS.indexOf(result.order.status as OrderStatus) : -1;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <p className="text-xs font-semibold text-[#F59E0B]">Suivi en temps réel</p>
        <h1 className="font-display text-3xl font-bold text-[#172B4D]">
          Suivre ma commande
        </h1>
        <p className="text-sm text-slate-600">
          Entrez votre numéro de commande (ex : LA-202611-0001) et votre téléphone (ex : 0600000000).
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end"
      >
        <div className="sm:col-span-5">
          <label htmlFor="trk-order" className="block text-xs font-semibold text-[#172B4D] mb-1">
            Numéro de commande *
          </label>
          <input
            id="trk-order"
            required
            placeholder="LA-202611-0001"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-mono-num uppercase"
          />
        </div>
        <div className="sm:col-span-4">
          <label htmlFor="trk-phone" className="block text-xs font-semibold text-[#172B4D] mb-1">
            Téléphone {token ? '(facultatif si connecté)' : '*'}
          </label>
          <input
            id="trk-phone"
            required={!token}
            placeholder="06XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
          />
        </div>
        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#172B4D] text-white text-sm font-semibold rounded-lg hover:opacity-95"
          >
            <Search className="w-4 h-4" />
            <span>{loading ? 'Recherche...' : 'Rechercher'}</span>
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <p className="text-xs text-slate-500">
                Commande passée le {formatDateFR(result.order.createdAt)}
              </p>
              <h2 className="font-display text-xl font-bold text-[#172B4D] font-mono-num">
                {result.order.orderNumber}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Statut actuel</p>
              <p className="text-base font-bold text-[#172B4D]">
                {ORDER_STATUS_LABELS[result.order.status as OrderStatus] || result.order.status}
              </p>
            </div>
          </div>

          {result.order.status === 'cancelled' ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
              Cette commande a été annulée.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {STEPS.map((step, index) => {
                const done = index <= currentIdx;
                return (
                  <div
                    key={step}
                    className={`p-3 rounded-xl border text-center space-y-1 ${
                      done
                        ? 'border-[#172B4D] bg-[#172B4D] text-white'
                        : 'border-slate-200 bg-[#F5F7FA] text-slate-500'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-5 h-5 mx-auto ${done ? 'text-[#F59E0B]' : 'text-slate-300'}`}
                    />
                    <p className="text-xs font-semibold">{ORDER_STATUS_LABELS[step]}</p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F5F7FA] p-4 rounded-xl text-sm">
            <div className="flex items-start gap-3">
              <Truck className="w-5 h-5 text-[#172B4D] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#172B4D]">{result.order.deliveryMethod}</p>
                <p className="text-xs text-slate-600">{result.order.address}</p>
                {result.delivery?.trackingCode && (
                  <p className="text-xs font-mono-num text-slate-500 mt-1">
                    Réf. suivi : {result.delivery.trackingCode}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-[#172B4D] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#172B4D]">
                  Total : <span className="font-mono-num">{formatMAD(result.order.totalAmount)}</span>
                </p>
                <p className="text-xs text-slate-600">
                  {result.items.length} article(s) commandé(s)
                </p>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F7FA] text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Article</th>
                  <th className="px-4 py-2.5 text-right">Qté</th>
                  <th className="px-4 py-2.5 text-right">Sous-total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.items.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2.5 font-medium text-[#172B4D]">
                      {item.productName}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono-num">{item.quantity}</td>
                    <td className="px-4 py-2.5 text-right font-mono-num">
                      {formatMAD(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
