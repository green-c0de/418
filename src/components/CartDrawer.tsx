import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatMAD } from '../lib/commerce';
import { SafeImage } from './SafeImage';

export function CartDrawer() {
  const {
    cart,
    cartCount,
    cartSubtotal,
    cartOpen,
    setCartOpen,
    updateCartQuantity,
    removeFromCart,
    navigate,
  } = useStore();

  if (!cartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px] no-print">
      <div
        className="fixed inset-0"
        onClick={() => setCartOpen(false)}
        aria-hidden="true"
      />
      <aside
        aria-label="Mon panier"
        className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#172B4D]" />
            <h2 className="font-display text-lg font-bold text-[#172B4D]">
              Mon panier ({cartCount})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Fermer le panier"
            className="p-2 text-slate-500 hover:text-[#172B4D] rounded-lg hover:bg-[#F5F7FA]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <ShoppingBag className="w-12 h-12 mx-auto text-slate-300" />
              <div>
                <p className="font-display font-semibold text-[#172B4D]">
                  Votre panier est vide
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Explorez notre catalogue pour ajouter des fournitures ou livres.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/boutique');
                }}
                className="px-5 py-2.5 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
              >
                Découvrir la boutique
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="py-4 flex gap-4">
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
                      setCartOpen(false);
                      navigate(`/produit/${item.slug}`);
                    }}
                    className="text-sm font-semibold text-[#172B4D] hover:underline line-clamp-2"
                  >
                    {item.name}
                  </a>
                  <p className="font-mono-num text-xs text-slate-500 mt-0.5">
                    {formatMAD(item.unitPrice)} / unité
                  </p>

                  <div className="flex items-center justify-between mt-3">
                    <div className="inline-flex items-center border border-slate-200 rounded-lg">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                        aria-label={`Diminuer la quantité de ${item.name}`}
                        className="p-1.5 text-slate-600 hover:bg-[#F5F7FA]"
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
                        aria-label={`Augmenter la quantité de ${item.name}`}
                        className="p-1.5 text-slate-600 hover:bg-[#F5F7FA] disabled:opacity-40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono-num text-sm font-bold text-[#172B4D]">
                        {formatMAD(item.unitPrice * item.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId)}
                        aria-label={`Supprimer ${item.name} du panier`}
                        className="p-1.5 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-slate-200 bg-[#F5F7FA] space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium">Sous-total</span>
              <span className="font-mono-num text-lg font-bold text-[#172B4D]">
                {formatMAD(cartSubtotal)}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Frais de livraison et codes promotionnels calculés lors de la commande.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/panier');
                }}
                className="px-4 py-2.5 border border-slate-300 bg-white text-[#172B4D] text-sm font-semibold rounded-lg hover:bg-slate-50"
              >
                Voir le panier
              </button>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/commander');
                }}
                className="px-4 py-2.5 bg-[#F59E0B] text-white text-sm font-semibold rounded-lg hover:opacity-95"
              >
                Passer commande
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
