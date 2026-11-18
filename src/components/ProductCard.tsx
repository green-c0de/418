import { Eye, Heart, ShoppingCart } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatMAD } from '../lib/commerce';
import { Product } from '../types/store';
import { SafeImage } from './SafeImage';

interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list';
}

export function ProductCard({ product, viewMode = 'grid' }: ProductCardProps) {
  const { navigate, addToCart, wishlistIds, toggleWishlist, setQuickViewProduct } = useStore();
  const isWishlisted = wishlistIds.includes(product.id);
  const outOfStock = product.stockQuantity <= 0;
  const lowStock = !outOfStock && product.stockQuantity <= product.alertThreshold;

  if (viewMode === 'list') {
    return (
      <article className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-5 items-stretch hover:shadow-md transition-all duration-200">
        <a
          href={`/produit/${product.slug}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/produit/${product.slug}`);
          }}
          className="w-full sm:w-48 h-48 bg-[#F5F7FA] rounded-lg overflow-hidden shrink-0 block"
        >
          <SafeImage
            src={product.primaryImage}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </a>

        <div className="flex-1 flex flex-col justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{product.category?.name || 'Librairie'}</span>
              {product.brand?.name && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{product.brand.name}</span>
                </>
              )}
              {product.isSample && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-700 font-medium">Exemple de démonstration</span>
                </>
              )}
            </div>
            <h3 className="font-display text-base font-semibold text-[#172B4D] mt-1">
              <a
                href={`/produit/${product.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/produit/${product.slug}`);
                }}
                className="hover:underline"
              >
                {product.name}
              </a>
            </h3>
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">
              {product.shortDescription}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono-num text-lg font-bold text-[#172B4D]">
                {formatMAD(product.effectivePrice)}
              </span>
              {product.discountPercent > 0 && (
                <>
                  <span className="font-mono-num text-xs text-slate-400 line-through">
                    {formatMAD(product.priceNum)}
                  </span>
                  <span className="text-xs font-semibold text-[#D97706]">
                    -{product.discountPercent}%
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium mr-2 ${
                  outOfStock
                    ? 'text-red-600'
                    : lowStock
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                }`}
              >
                {outOfStock
                  ? 'Rupture de stock'
                  : lowStock
                    ? `Stock faible (${product.stockQuantity})`
                    : 'Disponible'}
              </span>

              <button
                type="button"
                onClick={() => setQuickViewProduct(product)}
                aria-label={`Aperçu rapide de ${product.name}`}
                className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:text-[#172B4D] hover:bg-[#F5F7FA]"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-label={`Ajouter ${product.name} aux souhaits`}
                className={`p-2 border rounded-lg transition-colors ${
                  isWishlisted
                    ? 'border-amber-300 bg-amber-50 text-[#F59E0B]'
                    : 'border-slate-200 text-slate-600 hover:bg-[#F5F7FA]'
                }`}
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
              <button
                type="button"
                disabled={outOfStock}
                onClick={() => addToCart(product, 1)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#172B4D] text-white text-xs font-semibold rounded-lg hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{outOfStock ? 'Indisponible' : 'Ajouter au panier'}</span>
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <div className="relative aspect-[4/3] bg-[#F5F7FA] overflow-hidden">
        <a
          href={`/produit/${product.slug}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/produit/${product.slug}`);
          }}
          className="block w-full h-full"
        >
          <SafeImage
            src={product.primaryImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        </a>

        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => toggleWishlist(product.id)}
            aria-label={`Ajouter ${product.name} aux souhaits`}
            className={`p-2 rounded-lg bg-white/95 border border-slate-200/80 shadow-sm transition-colors ${
              isWishlisted ? 'text-[#F59E0B]' : 'text-slate-600 hover:text-[#172B4D]'
            }`}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setQuickViewProduct(product)}
            aria-label={`Aperçu rapide de ${product.name}`}
            className="p-2 rounded-lg bg-white/95 border border-slate-200/80 shadow-sm text-slate-600 hover:text-[#172B4D]"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="truncate">
              {product.category?.name || 'Article'}
              {product.brand?.name ? ` · ${product.brand.name}` : ''}
            </span>
            {product.discountPercent > 0 && (
              <span className="text-[#D97706] font-semibold shrink-0">
                -{product.discountPercent}%
              </span>
            )}
          </div>

          <h3 className="font-display text-[15px] font-semibold text-[#172B4D] mt-1 line-clamp-2 leading-snug">
            <a
              href={`/produit/${product.slug}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/produit/${product.slug}`);
              }}
              className="hover:underline"
            >
              {product.name}
            </a>
          </h3>

          {product.isSample && (
            <p className="text-[11px] text-slate-500 mt-1">
              Donnée de démonstration · Prix indicatif
            </p>
          )}
        </div>

        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="font-mono-num text-base font-bold text-[#172B4D]">
                {formatMAD(product.effectivePrice)}
              </span>
              {product.discountPercent > 0 && (
                <span className="font-mono-num text-xs text-slate-400 line-through">
                  {formatMAD(product.priceNum)}
                </span>
              )}
            </div>
            <span
              className={`text-xs font-medium ${
                outOfStock
                  ? 'text-red-600'
                  : lowStock
                    ? 'text-amber-700'
                    : 'text-emerald-700'
              }`}
            >
              {outOfStock ? 'Épuisé' : lowStock ? `Reste ${product.stockQuantity}` : 'En stock'}
            </span>
          </div>

          <button
            type="button"
            disabled={outOfStock}
            onClick={() => addToCart(product, 1)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#172B4D] text-white text-xs font-semibold rounded-lg hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity whitespace-nowrap"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{outOfStock ? 'Rupture de stock' : 'Ajouter au panier'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
