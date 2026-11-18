import React, { useEffect, useState } from 'react';
import { CheckCircle2, Minus, Plus, Printer, Tag, Trash2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  calculateOrderTotals,
  formatDateFR,
  formatMAD,
  PAYMENT_METHOD_LABELS,
} from '../lib/commerce';
import { SafeImage } from '../components/SafeImage';

export function CartCheckoutPage({ mode }: { mode: 'cart' | 'checkout' }) {
  const {
    cart,
    cartSubtotal,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    deliveryZones,
    settings,
    appliedCoupon,
    setAppliedCoupon,
    user,
    token,
    navigate,
    showToast,
  } = useStore();

  const [couponInput, setCouponInput] = useState(appliedCoupon?.code || '');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online' | 'bank_transfer'>('cod');

  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [city, setCity] = useState('Aït Melloul');
  const [address, setAddress] = useState('');
  const [instructions, setInstructions] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<{
    order: any;
    items: any[];
  } | null>(null);

  useEffect(() => {
    if (deliveryZones.length > 0 && selectedZoneId === null) {
      setSelectedZoneId(deliveryZones[0].id);
    }
  }, [deliveryZones, selectedZoneId]);

  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.fullName);
      if (!customerPhone) setCustomerPhone(user.phone);
      if (!customerEmail) setCustomerEmail(user.email);
    }
  }, [user]);

  const selectedZone = deliveryZones.find((z) => z.id === selectedZoneId) || deliveryZones[0];
  const baseDeliveryFee = selectedZone ? parseFloat(selectedZone.fee) : 0;
  const freeThreshold =
    settings?.delivery?.freeDeliveryThreshold && Number(settings.delivery.freeDeliveryThreshold) > 0
      ? Number(settings.delivery.freeDeliveryThreshold)
      : null;
  const taxRate =
    settings?.tax?.enabled && Number(settings.tax.ratePercent) > 0
      ? Number(settings.tax.ratePercent)
      : 0;

  const totals = calculateOrderTotals({
    items: cart.map((i) => ({ unitPrice: i.unitPrice, quantity: i.quantity })),
    coupon: appliedCoupon
      ? {
          code: appliedCoupon.code,
          discountType: 'fixed',
          discountValue: appliedCoupon.discountAmount,
          minPurchase: 0,
          maxUses: null,
          usedCount: 0,
          expiresAt: null,
          isActive: true,
        }
      : null,
    baseDeliveryFee,
    freeDeliveryThreshold: freeThreshold,
    taxRatePercent: taxRate,
  });

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    setValidatingCoupon(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput, subtotal: cartSubtotal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Code invalide');
      setAppliedCoupon({
        code: data.coupon.code,
        discountAmount: data.discountAmount,
        description: data.coupon.description,
      });
      showToast(`Code "${data.coupon.code}" appliqué.`);
    } catch (err: any) {
      setCouponError(err.message);
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          city: selectedZone?.isStorePickup ? 'Aït Melloul' : city,
          address: selectedZone?.isStorePickup ? 'Retrait en magasin' : address,
          instructions,
          deliveryZoneId: selectedZone?.id,
          paymentMethod,
          couponCode: appliedCoupon?.code || '',
          items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Impossible de valider la commande.');
      setConfirmedOrder(data);
      clearCart();
      showToast(`Commande ${data.order.orderNumber} confirmée !`);
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedOrder) {
    const { order, items } = confirmedOrder;
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 space-y-6">
          <div className="flex items-start gap-4 pb-6 border-b border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-emerald-700">Commande enregistrée</p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#172B4D]">
                Merci pour votre commande !
              </h1>
              <p className="text-sm text-slate-600">
                Numéro de commande :{' '}
                <span className="font-mono-num font-bold text-[#172B4D]">
                  {order.orderNumber}
                </span>{' '}
                · Date : {formatDateFR(order.createdAt)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-[#F5F7FA] p-4 rounded-xl">
            <div>
              <p className="text-xs text-slate-500 font-semibold">Client</p>
              <p className="font-semibold text-[#172B4D]">{order.customerName}</p>
              <p>{order.customerPhone}</p>
              {order.customerEmail && <p>{order.customerEmail}</p>}
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Livraison &amp; Paiement</p>
              <p className="font-semibold text-[#172B4D]">{order.deliveryMethod}</p>
              <p>{order.address}</p>
              <p>{PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}</p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F7FA] text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Produit</th>
                  <th className="px-4 py-2.5 text-right">Qté</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2.5 font-medium text-[#172B4D]">
                      {item.productName}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono-num">{item.quantity}</td>
                    <td className="px-4 py-2.5 text-right font-mono-num font-semibold">
                      {formatMAD(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1.5 text-sm max-w-xs ml-auto">
            <div className="flex justify-between">
              <span className="text-slate-600">Sous-total</span>
              <span className="font-mono-num">{formatMAD(order.subtotal)}</span>
            </div>
            {parseFloat(order.discountAmount) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Réduction</span>
                <span className="font-mono-num">-{formatMAD(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-600">Frais de livraison</span>
              <span className="font-mono-num">{formatMAD(order.deliveryFee)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-base text-[#172B4D]">
              <span>Total à payer</span>
              <span className="font-mono-num">{formatMAD(order.totalAmount)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200 no-print">
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/suivi?orderNumber=${encodeURIComponent(order.orderNumber)}&phone=${encodeURIComponent(order.customerPhone || '')}`
                )
              }
              className="px-5 py-2.5 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
            >
              Suivre ma commande
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-300 text-[#172B4D] text-sm font-semibold rounded-lg"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer le reçu</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/boutique')}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-[#172B4D]"
            >
              Continuer mes achats
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-[#172B4D]">
          Votre panier est vide
        </h1>
        <p className="text-sm text-slate-600">
          Ajoutez des articles depuis notre boutique avant de passer commande.
        </p>
        <button
          type="button"
          onClick={() => navigate('/boutique')}
          className="px-6 py-3 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
        >
          Découvrir le catalogue
        </button>
      </div>
    );
  }

  const paySettings = settings?.payment;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-display text-3xl font-bold text-[#172B4D] mb-8">
        {mode === 'cart' ? 'Mon panier' : 'Finaliser ma commande'}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          {mode === 'cart' ? (
            <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
              {cart.map((item) => (
                <div key={item.productId} className="p-4 sm:p-5 flex gap-4 items-center">
                  <SafeImage
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 rounded-lg object-cover bg-[#F5F7FA] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <a
                      href={`/produit/${item.slug}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/produit/${item.slug}`);
                      }}
                      className="font-display font-semibold text-[#172B4D] hover:underline line-clamp-2"
                    >
                      {item.name}
                    </a>
                    <p className="text-xs text-slate-500 font-mono-num mt-0.5">
                      {formatMAD(item.unitPrice)} / unité · SKU : {item.sku}
                    </p>
                  </div>

                  <div className="inline-flex items-center border border-slate-300 rounded-lg">
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                      aria-label={`Diminuer ${item.name}`}
                      className="p-2"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-xs font-mono-num font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      disabled={item.quantity >= item.stockQuantity}
                      onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                      aria-label={`Augmenter ${item.name}`}
                      className="p-2 disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right min-w-[90px]">
                    <p className="font-mono-num font-bold text-[#172B4D]">
                      {formatMAD(item.unitPrice * item.quantity)}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId)}
                      className="text-xs text-red-600 hover:underline mt-1 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Retirer</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <form
              id="checkout-form"
              onSubmit={handlePlaceOrder}
              className="space-y-6"
            >
              {/* Customer info */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h2 className="font-display text-lg font-bold text-[#172B4D]">
                  1. Informations client
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="chk-name" className="block text-xs font-semibold text-[#172B4D] mb-1">
                      Nom complet *
                    </label>
                    <input
                      id="chk-name"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="chk-phone" className="block text-xs font-semibold text-[#172B4D] mb-1">
                      Numéro de téléphone *
                    </label>
                    <input
                      id="chk-phone"
                      type="tel"
                      required
                      placeholder="06XXXXXXXX"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="chk-email" className="block text-xs font-semibold text-[#172B4D] mb-1">
                      Adresse e-mail (facultatif)
                    </label>
                    <input
                      id="chk-email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery options */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h2 className="font-display text-lg font-bold text-[#172B4D]">
                  2. Mode de livraison
                </h2>
                <div className="space-y-2.5">
                  {deliveryZones.map((zone) => (
                    <label
                      key={zone.id}
                      className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition-colors ${
                        selectedZone?.id === zone.id
                          ? 'border-[#172B4D] bg-[#F5F7FA]'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="deliveryZone"
                          checked={selectedZone?.id === zone.id}
                          onChange={() => {
                            setSelectedZoneId(zone.id);
                            if (zone.city && !zone.city.includes('Autres')) {
                              setCity(zone.city);
                            }
                          }}
                        />
                        <div>
                          <p className="text-sm font-semibold text-[#172B4D]">{zone.name}</p>
                          <p className="text-xs text-slate-500">{zone.estimatedDelay}</p>
                        </div>
                      </div>
                      <span className="font-mono-num text-sm font-bold text-[#172B4D]">
                        {zone.isStorePickup ? 'Gratuit' : formatMAD(zone.fee)}
                      </span>
                    </label>
                  ))}
                </div>

                {selectedZone && !selectedZone.isStorePickup && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label htmlFor="chk-city" className="block text-xs font-semibold text-[#172B4D] mb-1">
                        Ville *
                      </label>
                      <input
                        id="chk-city"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="chk-addr" className="block text-xs font-semibold text-[#172B4D] mb-1">
                        Adresse complète *
                      </label>
                      <input
                        id="chk-addr"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Quartier, rue, numéro..."
                        className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="chk-notes" className="block text-xs font-semibold text-[#172B4D] mb-1">
                    Instructions supplémentaires
                  </label>
                  <textarea
                    id="chk-notes"
                    rows={2}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Précisions pour la préparation ou la livraison..."
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Payment method */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h2 className="font-display text-lg font-bold text-[#172B4D]">
                  3. Mode de paiement
                </h2>
                <div className="space-y-2.5">
                  {paySettings?.codEnabled !== false && (
                    <label
                      className={`flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer ${
                        paymentMethod === 'cod'
                          ? 'border-[#172B4D] bg-[#F5F7FA]'
                          : 'border-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-sm font-semibold text-[#172B4D]">
                          {paySettings?.codLabel || 'Paiement à la livraison'}
                        </p>
                        <p className="text-xs text-slate-600">
                          {paySettings?.codInstructions}
                        </p>
                      </div>
                    </label>
                  )}

                  {paySettings?.bankTransferEnabled && (
                    <label
                      className={`flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer ${
                        paymentMethod === 'bank_transfer'
                          ? 'border-[#172B4D] bg-[#F5F7FA]'
                          : 'border-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === 'bank_transfer'}
                        onChange={() => setPaymentMethod('bank_transfer')}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-sm font-semibold text-[#172B4D]">
                          {paySettings?.bankTransferLabel || 'Virement bancaire'}
                        </p>
                        <p className="text-xs text-slate-600">
                          {paySettings?.bankTransferInstructions}
                        </p>
                      </div>
                    </label>
                  )}

                  {paySettings?.onlineEnabled && (
                    <label
                      className={`flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer ${
                        paymentMethod === 'online'
                          ? 'border-[#172B4D] bg-[#F5F7FA]'
                          : 'border-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === 'online'}
                        onChange={() => setPaymentMethod('online')}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-sm font-semibold text-[#172B4D]">
                          Paiement en ligne ({paySettings.onlineProvider})
                        </p>
                        <p className="text-xs text-slate-600">
                          {paySettings.onlineInstructions}
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Summary Column */}
        <div className="lg:col-span-5">
          <div className="bg-[#F5F7FA] border border-slate-200 rounded-2xl p-6 space-y-5 sticky top-24">
            <h2 className="font-display text-lg font-bold text-[#172B4D]">
              Récapitulatif de commande
            </h2>

            {mode === 'checkout' && (
              <div className="divide-y divide-slate-200 max-h-60 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.productId} className="py-2.5 flex justify-between text-sm">
                    <span className="text-[#252B36] pr-3">
                      {item.name} × <span className="font-mono-num">{item.quantity}</span>
                    </span>
                    <span className="font-mono-num font-semibold text-[#172B4D] shrink-0">
                      {formatMAD(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Promo code */}
            <form onSubmit={handleApplyCoupon} className="space-y-2">
              <label htmlFor="coupon-code" className="block text-xs font-semibold text-[#172B4D]">
                Code promotionnel
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="coupon-code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Ex : BIENVENUE10"
                    className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm uppercase"
                  />
                </div>
                <button
                  type="submit"
                  disabled={validatingCoupon}
                  className="px-4 py-2 bg-[#172B4D] text-white text-xs font-semibold rounded-lg"
                >
                  Appliquer
                </button>
              </div>
              {couponError && <p className="text-xs text-red-600">{couponError}</p>}
              {appliedCoupon && (
                <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
                  <span>Code {appliedCoupon.code} appliqué</span>
                  <button
                    type="button"
                    onClick={() => setAppliedCoupon(null)}
                    className="underline text-slate-500"
                  >
                    Retirer
                  </button>
                </div>
              )}
            </form>

            <div className="space-y-2.5 pt-3 border-t border-slate-200 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Sous-total</span>
                <span className="font-mono-num font-medium">{formatMAD(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Réduction</span>
                <span className="font-mono-num font-medium text-emerald-700">
                  -{formatMAD(totals.discountAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Frais de livraison</span>
                <span className="font-mono-num font-medium">
                  {totals.freeDeliveryApplied ? 'Gratuit' : formatMAD(totals.deliveryFee)}
                </span>
              </div>
              {totals.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">
                    {settings?.tax?.label || 'TVA'} ({taxRate}%)
                  </span>
                  <span className="font-mono-num font-medium">{formatMAD(totals.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-slate-300 text-base font-bold text-[#172B4D]">
                <span>Total à payer</span>
                <span className="font-mono-num text-lg">{formatMAD(totals.totalAmount)}</span>
              </div>
            </div>

            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {submitError}
              </div>
            )}

            {mode === 'cart' ? (
              <button
                type="button"
                onClick={() => navigate('/commander')}
                className="w-full py-3 bg-[#F59E0B] text-white text-sm font-semibold rounded-lg hover:opacity-95"
              >
                Passer commande
              </button>
            ) : (
              <button
                type="submit"
                form="checkout-form"
                disabled={submitting}
                className="w-full py-3 bg-[#F59E0B] text-white text-sm font-semibold rounded-lg hover:opacity-95 disabled:opacity-60"
              >
                {submitting ? 'Validation en cours...' : 'Confirmer la commande'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
