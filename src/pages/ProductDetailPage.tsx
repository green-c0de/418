import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  Truck,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatDateFR, formatMAD } from '../lib/commerce';
import { Product, Review } from '../types/store';
import { ProductCard } from '../components/ProductCard';
import { SafeImage } from '../components/SafeImage';

export function ProductDetailPage({ slug }: { slug: string }) {
  const { navigate, addToCart, toggleWishlist, wishlistIds, user, deliveryZones, showToast } =
    useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [revName, setRevName] = useState(user?.fullName || '');
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState('');
  const [submittingRev, setSubmittingRev] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error('Produit introuvable.');
        const data = await res.json();
        if (!active) return;
        setProduct(data.product);
        setReviews(data.reviews || []);
        setRelated(data.related || []);
        setSelectedImage(
          data.product.primaryImage || data.product.images?.[0]?.url || ''
        );
        setQty(1);
      } catch (err: any) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [slug]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setSubmittingRev(true);
    try {
      const res = await fetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: revName,
          rating: revRating,
          comment: revComment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur avis');
      setReviews((prev) => [data.review, ...prev]);
      setRevComment('');
      showToast('Merci ! Votre avis a été publié.');
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setSubmittingRev(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="h-96 bg-[#F5F7FA] rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-[#172B4D]">
          {error || 'Produit introuvable'}
        </h1>
        <button
          type="button"
          onClick={() => navigate('/boutique')}
          className="px-5 py-2.5 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
        >
          Retour à la boutique
        </button>
      </div>
    );
  }

  const outOfStock = product.stockQuantity <= 0;
  const isWishlisted = wishlistIds.includes(product.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">
      <div>
        <button
          type="button"
          onClick={() => navigate('/boutique')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#172B4D] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au catalogue</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Gallery */}
          <div className="lg:col-span-6 space-y-4">
            <div className="aspect-square bg-[#F5F7FA] border border-slate-200 rounded-2xl overflow-hidden">
              <SafeImage
                src={selectedImage || product.primaryImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images && product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {product.images.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedImage(img.url)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 shrink-0 ${
                      selectedImage === img.url
                        ? 'border-[#172B4D]'
                        : 'border-slate-200'
                    }`}
                  >
                    <SafeImage
                      src={img.url}
                      alt={img.altText || product.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Purchase Module */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{product.category?.name || 'Boutique'}</span>
                {product.brand?.name && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{product.brand.name}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span className="font-mono-num">SKU : {product.sku}</span>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#172B4D]">
                {product.name}
              </h1>

              {product.isSample && (
                <p className="text-xs font-medium text-amber-700">
                  Article de démonstration — Prix et caractéristiques modifiables depuis l’administration.
                </p>
              )}
            </div>

            <div className="flex items-baseline gap-3 pb-4 border-b border-slate-200">
              <span className="font-mono-num text-3xl font-bold text-[#172B4D]">
                {formatMAD(product.effectivePrice)}
              </span>
              {product.discountPercent > 0 && (
                <>
                  <span className="font-mono-num text-lg text-slate-400 line-through">
                    {formatMAD(product.priceNum)}
                  </span>
                  <span className="text-sm font-bold text-[#D97706]">
                    -{product.discountPercent}%
                  </span>
                </>
              )}
            </div>

            <p className="text-sm sm:text-base text-[#252B36] leading-relaxed">
              {product.description || product.shortDescription}
            </p>

            <div className="flex items-center gap-2 text-sm font-semibold">
              {outOfStock ? (
                <span className="text-red-600">Rupture de stock</span>
              ) : (
                <span className="text-emerald-700 inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>En stock ({product.stockQuantity} unité(s) disponible(s))</span>
                </span>
              )}
            </div>

            {!outOfStock && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-700">Quantité</span>
                  <div className="inline-flex items-center border border-slate-300 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      aria-label="Diminuer la quantité"
                      className="p-2.5 text-slate-600 hover:bg-[#F5F7FA]"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 font-mono-num font-semibold text-sm">{qty}</span>
                    <button
                      type="button"
                      disabled={qty >= product.stockQuantity}
                      onClick={() => setQty((q) => Math.min(product.stockQuantity, q + 1))}
                      aria-label="Augmenter la quantité"
                      className="p-2.5 text-slate-600 hover:bg-[#F5F7FA] disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => addToCart(product, qty)}
                    className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#172B4D] text-white text-sm font-semibold rounded-lg hover:opacity-95"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Ajouter au panier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      addToCart(product, qty);
                      navigate('/commander');
                    }}
                    className="flex-1 min-w-[180px] px-6 py-3 bg-[#F59E0B] text-white text-sm font-semibold rounded-lg hover:opacity-95"
                  >
                    Acheter maintenant
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleWishlist(product.id)}
                    aria-label="Ajouter aux souhaits"
                    className={`p-3 border rounded-lg ${
                      isWishlisted
                        ? 'border-amber-300 bg-amber-50 text-[#F59E0B]'
                        : 'border-slate-300 text-slate-600 hover:bg-[#F5F7FA]'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            )}

            {/* Specifications */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="pt-4 border-t border-slate-200">
                <h2 className="font-display text-sm font-bold text-[#172B4D] mb-3">
                  Caractéristiques techniques
                </h2>
                <dl className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-sm">
                  {Object.entries(product.specifications).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-3 px-4 py-2.5 bg-white">
                      <dt className="text-slate-500 font-medium">{k}</dt>
                      <dd className="col-span-2 text-[#172B4D]">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Delivery info */}
            <div className="bg-[#F5F7FA] border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#172B4D]">
                <Truck className="w-4 h-4 text-[#F59E0B]" />
                <span>Options de livraison &amp; retrait</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-1">
                {deliveryZones.slice(0, 3).map((z) => (
                  <li key={z.id}>
                    • {z.name} — {z.estimatedDelay}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Product Reviews */}
      <section className="pt-10 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-4">
          <h2 className="font-display text-xl font-bold text-[#172B4D]">
            Donner votre avis
          </h2>
          <form
            onSubmit={handleReviewSubmit}
            className="bg-[#F5F7FA] border border-slate-200 rounded-xl p-5 space-y-4"
          >
            <div>
              <label htmlFor="rev-name" className="block text-xs font-semibold text-[#172B4D] mb-1">
                Nom complet
              </label>
              <input
                id="rev-name"
                required
                value={revName}
                onChange={(e) => setRevName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="rev-rating" className="block text-xs font-semibold text-[#172B4D] mb-1">
                Note
              </label>
              <select
                id="rev-rating"
                value={revRating}
                onChange={(e) => setRevRating(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value={5}>5 / 5 — Excellent</option>
                <option value={4}>4 / 5 — Très bien</option>
                <option value={3}>3 / 5 — Satisfaisant</option>
                <option value={2}>2 / 5 — Moyen</option>
                <option value={1}>1 / 5 — Insuffisant</option>
              </select>
            </div>
            <div>
              <label htmlFor="rev-comment" className="block text-xs font-semibold text-[#172B4D] mb-1">
                Votre commentaire
              </label>
              <textarea
                id="rev-comment"
                required
                rows={3}
                value={revComment}
                onChange={(e) => setRevComment(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={submittingRev}
              className="px-5 py-2.5 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
            >
              {submittingRev ? 'Envoi...' : 'Publier mon avis'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <h2 className="font-display text-xl font-bold text-[#172B4D]">
            Avis clients ({reviews.length})
          </h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-slate-500">
              Aucun avis pour cet article pour le moment.
            </p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-sm text-[#172B4D]">
                        {r.authorName}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">
                        {formatDateFR(r.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 text-[#F59E0B]">
                      {Array.from({ length: r.rating }).map((_, idx) => (
                        <Star key={idx} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-700">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="pt-10 border-t border-slate-200">
          <h2 className="font-display text-2xl font-bold text-[#172B4D] mb-6">
            Produits similaires
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
