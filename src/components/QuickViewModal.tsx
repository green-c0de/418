import { useState } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatMAD } from '../lib/commerce';
import { SafeImage } from './SafeImage';

export function QuickViewModal() {
  const { quickViewProduct, setQuickViewProduct, addToCart, navigate } = useStore();
  const [qty, setQty] = useState(1);

  if (!quickViewProduct) return null;

  const outOfStock = quickViewProduct.stockQuantity <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 no-print">
      <div
        className="fixed inset-0"
        onClick={() => setQuickViewProduct(null)}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Aperçu de ${quickViewProduct.name}`}
        className="relative z-10 bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2"
      >
        <button
          type="button"
          onClick={() => setQuickViewProduct(null)}
          aria-label="Fermer l'aperçu"
          className="absolute top-3 right-3 z-20 p-2 bg-white/90 rounded-lg border border-slate-200 text-slate-600 hover:text-[#172B4D]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="bg-[#F5F7FA] aspect-square md:aspect-auto">
          <SafeImage
            src={quickViewProduct.primaryImage}
            alt={quickViewProduct.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-6 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="text-xs text-slate-500">
              {quickViewProduct.category?.name || 'Catalogue'} · Réf. {quickViewProduct.sku}
            </div>
            <h2 className="font-display text-xl font-bold text-[#172B4D]">
              {quickViewProduct.name}
            </h2>

            <div className="flex items-baseline gap-2.5">
              <span className="font-mono-num text-2xl font-bold text-[#172B4D]">
                {formatMAD(quickViewProduct.effectivePrice)}
              </span>
              {quickViewProduct.discountPercent > 0 && (
                <span className="font-mono-num text-sm text-slate-400 line-through">
                  {formatMAD(quickViewProduct.priceNum)}
                </span>
              )}
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              {quickViewProduct.shortDescription || quickViewProduct.description}
            </p>

            <p
              className={`text-xs font-semibold ${
                outOfStock ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {outOfStock
                ? 'Actuellement en rupture de stock'
                : `En stock (${quickViewProduct.stockQuantity} disponible(s))`}
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            {!outOfStock && (
              <div className="flex items-center gap-3">
                <label htmlFor="quickview-qty" className="text-xs font-medium text-slate-600">
                  Quantité
                </label>
                <input
                  id="quickview-qty"
                  type="number"
                  min={1}
                  max={quickViewProduct.stockQuantity}
                  value={qty}
                  onChange={(e) =>
                    setQty(
                      Math.min(
                        quickViewProduct.stockQuantity,
                        Math.max(1, Number(e.target.value) || 1)
                      )
                    )
                  }
                  className="w-20 border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-mono-num"
                />
              </div>
            )}

            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={outOfStock}
                onClick={() => {
                  addToCart(quickViewProduct, qty);
                  setQuickViewProduct(null);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#172B4D] text-white text-sm font-semibold rounded-lg hover:opacity-95 disabled:opacity-40"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Ajouter au panier</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const slug = quickViewProduct.slug;
                  setQuickViewProduct(null);
                  navigate(`/produit/${slug}`);
                }}
                className="px-4 py-2.5 border border-slate-300 text-sm font-semibold text-[#172B4D] rounded-lg hover:bg-[#F5F7FA]"
              >
                Détails
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
