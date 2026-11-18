import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  HeadphonesIcon,
  MapPin,
  ShieldCheck,
  Star,
  Truck,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatDateFR, formatMAD } from '../lib/commerce';
import { Product } from '../types/store';
import { ProductCard } from '../components/ProductCard';
import { SafeImage } from '../components/SafeImage';

export function HomePage() {
  const { settings, categories, testimonials, navigate, addToCart } = useStore();
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [promoProducts, setPromoProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState<string | null>(null);
  const [newsletterErr, setNewsletterErr] = useState<string | null>(null);
  const [submittingNews, setSubmittingNews] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [bestRes, newRes, promoRes] = await Promise.all([
          fetch('/api/products?bestSeller=true&limit=4'),
          fetch('/api/products?sort=newest&limit=4'),
          fetch('/api/products?promo=true&limit=4'),
        ]);
        const [bestData, newData, promoData] = await Promise.all([
          bestRes.json(),
          newRes.json(),
          promoRes.json(),
        ]);
        if (!active) return;
        setBestSellers(bestData.items || []);
        setNewArrivals(newData.items || []);
        setPromoProducts(promoData.items || []);
      } catch (err) {
        console.error('Home products load error:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterErr(null);
    setNewsletterMsg(null);
    setSubmittingNews(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur inscription');
      setNewsletterMsg(data.message);
      setNewsletterEmail('');
    } catch (err: any) {
      setNewsletterErr(err.message);
    } finally {
      setSubmittingNews(false);
    }
  };

  const hp = settings?.homepage;
  const visible = hp?.visibleSections || {};
  const order = hp?.sectionsOrder || [
    'categories',
    'best_sellers',
    'new_arrivals',
    'special_offers',
    'why_us',
    'reviews',
    'newsletter',
  ];

  const renderSection = (key: string) => {
    if (visible[key] === false) return null;

    switch (key) {
      case 'categories':
        return (
          <section key="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-semibold text-[#F59E0B] tracking-wide">
                  Nos rayons
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172B4D] mt-1">
                  Explorer par catégorie
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/boutique')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#172B4D] hover:text-[#F59E0B] whitespace-nowrap"
              >
                <span>Tout le catalogue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {categories.map((cat) => (
                <a
                  key={cat.id}
                  href={`/boutique?category=${cat.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/boutique?category=${encodeURIComponent(cat.slug)}`);
                  }}
                  className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 flex flex-col"
                >
                  <div className="aspect-[4/3] bg-[#F5F7FA] overflow-hidden">
                    <SafeImage
                      src={cat.imageUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3.5">
                    <h3 className="font-display text-sm font-semibold text-[#172B4D] line-clamp-2">
                      {cat.name}
                    </h3>
                  </div>
                </a>
              ))}
            </div>
          </section>
        );

      case 'best_sellers':
        return (
          <section key="best_sellers" className="bg-[#F5F7FA] py-14">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                  <p className="text-xs font-semibold text-[#F59E0B]">
                    Sélection populaire · Catalogue de démonstration
                  </p>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172B4D] mt-1">
                    Meilleures ventes
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/boutique?sort=popular')}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#172B4D] hover:text-[#F59E0B]"
                >
                  <span>Voir toutes les meilleures ventes</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-80 bg-white rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {bestSellers.map((prod) => (
                    <ProductCard key={prod.id} product={prod} />
                  ))}
                </div>
              )}
            </div>
          </section>
        );

      case 'new_arrivals':
        return (
          <section key="new_arrivals" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-semibold text-[#F59E0B]">Récemment ajoutés</p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172B4D] mt-1">
                  Nouveautés
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/boutique?sort=newest')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#172B4D] hover:text-[#F59E0B]"
              >
                <span>Découvrir les nouveautés</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {newArrivals.map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          </section>
        );

      case 'special_offers':
        if (promoProducts.length === 0) return null;
        return (
          <section key="special_offers" className="bg-[#172B4D] text-white py-14">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                  <p className="text-xs font-semibold text-[#F59E0B]">
                    {hp?.promoBannerTitle || 'Offres spéciales'}
                  </p>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                    Promotions en cours
                  </h2>
                  <p className="text-sm text-white/75 mt-1">
                    {hp?.promoBannerSubtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/boutique?promo=true')}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F59E0B] hover:underline whitespace-nowrap"
                >
                  <span>Toutes les promotions</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {promoProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-white text-[#252B36] rounded-xl overflow-hidden flex flex-col"
                  >
                    <a
                      href={`/produit/${prod.slug}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/produit/${prod.slug}`);
                      }}
                      className="aspect-[4/3] bg-[#F5F7FA] block overflow-hidden"
                    >
                      <SafeImage
                        src={prod.primaryImage}
                        alt={prod.name}
                        className="w-full h-full object-cover"
                      />
                    </a>
                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">{prod.category?.name}</span>
                          <span className="font-bold text-[#D97706]">
                            -{prod.discountPercent}%
                          </span>
                        </div>
                        <h3 className="font-display font-semibold text-[#172B4D] mt-1 line-clamp-2">
                          <a
                            href={`/produit/${prod.slug}`}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/produit/${prod.slug}`);
                            }}
                            className="hover:underline"
                          >
                            {prod.name}
                          </a>
                        </h3>
                        {prod.promoExpiresAt && (
                          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Valable jusqu’au {formatDateFR(prod.promoExpiresAt)}</span>
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-2.5">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono-num text-lg font-bold text-[#172B4D]">
                            {formatMAD(prod.effectivePrice)}
                          </span>
                          <span className="font-mono-num text-xs text-slate-400 line-through">
                            {formatMAD(prod.priceNum)}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={prod.stockQuantity <= 0}
                          onClick={() => addToCart(prod, 1)}
                          className="w-full py-2 px-4 bg-[#F59E0B] text-white text-xs font-semibold rounded-lg hover:opacity-95 disabled:opacity-40"
                        >
                          {prod.stockQuantity <= 0 ? 'Rupture de stock' : 'Profiter de l’offre'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'why_us':
        return (
          <section key="why_us" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="max-w-2xl mb-10">
              <p className="text-xs font-semibold text-[#F59E0B]">Nos engagements</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172B4D] mt-1">
                Pourquoi choisir Librairie Amine ?
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Award,
                  title: 'Produits de qualité',
                  desc: 'Sélection rigoureuse de cahiers, fournitures scolaires, livres et articles de bureau.',
                },
                {
                  icon: CheckCircle2,
                  title: 'Prix compétitifs',
                  desc: 'Tarification transparente en dirhams (DH) adaptée aux familles, étudiants et entreprises.',
                },
                {
                  icon: MapPin,
                  title: 'Service de proximité',
                  desc: 'Votre librairie de référence à Aït Melloul, avec retrait rapide en boutique.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Commande facile',
                  desc: 'Parcourez le catalogue, vérifiez le stock réel et commandez en quelques clics.',
                },
                {
                  icon: Truck,
                  title: 'Livraison disponible',
                  desc: 'Expédition vers Aït Melloul, Grand Agadir et les autres villes configurées au Maroc.',
                },
                {
                  icon: HeadphonesIcon,
                  title: 'Accompagnement client',
                  desc: 'Suivi de commande transparent et conseils dédiés pour vos listes scolaires et commandes bureau.',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="bg-white border border-slate-200 rounded-xl p-6 space-y-2.5"
                  >
                    <Icon className="w-6 h-6 text-[#F59E0B]" />
                    <h3 className="font-display text-base font-bold text-[#172B4D]">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>
        );

      case 'reviews':
        if (testimonials.length === 0) return null;
        return (
          <section key="reviews" className="bg-[#F5F7FA] py-14">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-2xl mb-10">
                <p className="text-xs font-semibold text-[#F59E0B]">
                  Retours clients · Exemples modifiables dans l’administration
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172B4D] mt-1">
                  Avis de nos clients
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {testimonials.slice(0, 3).map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-1 text-[#F59E0B]">
                        {Array.from({ length: rev.rating }).map((_, idx) => (
                          <Star key={idx} className="w-4 h-4 fill-current" />
                        ))}
                      </div>
                      <p className="text-sm text-[#252B36] leading-relaxed">
                        « {rev.comment} »
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-sm font-semibold text-[#172B4D]">{rev.authorName}</p>
                      <p className="text-xs text-slate-500">{rev.authorRole}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'newsletter':
        return (
          <section key="newsletter" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="max-w-xl space-y-2">
                <p className="text-xs font-semibold text-[#F59E0B]">Restez informé</p>
                <h2 className="font-display text-2xl font-bold text-[#172B4D]">
                  Inscrivez-vous à notre newsletter
                </h2>
                <p className="text-sm text-slate-600">
                  Recevez les nouveautés de la rentrée scolaire, les arrivages de livres et les offres de la Librairie Amine.
                </p>
              </div>

              <form onSubmit={handleNewsletter} className="w-full lg:w-auto flex-1 max-w-md space-y-2">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <label htmlFor="newsletter-email" className="sr-only">
                    Adresse e-mail
                  </label>
                  <input
                    id="newsletter-email"
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="votre.email@exemple.ma"
                    className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#172B4D]"
                  />
                  <button
                    type="submit"
                    disabled={submittingNews}
                    className="px-5 py-2.5 bg-[#172B4D] text-white text-sm font-semibold rounded-lg hover:opacity-95 disabled:opacity-60 whitespace-nowrap"
                  >
                    {submittingNews ? 'Envoi...' : "S'inscrire"}
                  </button>
                </div>
                {newsletterMsg && (
                  <p className="text-xs font-medium text-emerald-700">{newsletterMsg}</p>
                )}
                {newsletterErr && (
                  <p className="text-xs font-medium text-red-600">{newsletterErr}</p>
                )}
              </form>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-[#F5F7FA] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold text-[#F59E0B] tracking-wide">
                Librairie Amine · Aït Melloul, Maroc
              </p>
              <h1
                className="font-display font-extrabold text-[#172B4D] tracking-tight leading-[1.12]"
                style={{
                  fontSize: 'clamp(2.1rem, 3.8vw, 3.25rem)',
                  textWrap: 'balance',
                }}
              >
                {hp?.heroHeadline || 'Tout ce dont vous avez besoin, au même endroit !'}
              </h1>
              <p className="text-base sm:text-lg text-[#252B36]/80 leading-relaxed max-w-xl">
                {hp?.heroSubtitle ||
                  'Découvrez notre sélection de fournitures scolaires, articles de bureau, livres et accessoires.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <button
                type="button"
                onClick={() => navigate('/boutique')}
                className="px-6 py-3 bg-[#172B4D] text-white text-sm font-semibold rounded-lg hover:opacity-95 transition-opacity whitespace-nowrap"
              >
                Découvrir nos produits
              </button>
              <button
                type="button"
                onClick={() => navigate('/boutique?promo=true')}
                className="px-6 py-3 bg-white border border-slate-300 text-[#172B4D] text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                Voir les promotions
              </button>
            </div>

            <div className="pt-4 border-t border-slate-200/80 grid grid-cols-3 gap-4 text-xs text-slate-600">
              <div>
                <p className="font-semibold text-[#172B4D]">Aït Melloul</p>
                <p>Retrait &amp; proximité</p>
              </div>
              <div>
                <p className="font-semibold text-[#172B4D]">Paiement flexible</p>
                <p>À la livraison ou virement</p>
              </div>
              <div>
                <p className="font-semibold text-[#172B4D]">Suivi en ligne</p>
                <p>Statut en temps réel</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-full min-h-[280px] lg:min-h-[420px]">
              <SafeImage
                src={
                  hp?.heroImage ||
                  '/src/assets/images/hero_librairie_stationery_1795013246365.jpg'
                }
                alt="Librairie Amine — Fournitures scolaires, livres et papeterie"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {order.map((sectionKey) => renderSection(sectionKey))}
    </div>
  );
}
