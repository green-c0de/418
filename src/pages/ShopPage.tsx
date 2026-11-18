import React, { useEffect, useState } from 'react';
import { LayoutGrid, List, Search, SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types/store';
import { ProductCard } from '../components/ProductCard';

export function ShopPage() {
  const { searchQuery, categories, brands, navigate } = useStore();
  const params = new URLSearchParams(searchQuery);

  const [search, setSearch] = useState(params.get('search') || '');
  const [category, setCategory] = useState(params.get('category') || '');
  const [brand, setBrand] = useState(params.get('brand') || '');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStock, setInStock] = useState(false);
  const [promo, setPromo] = useState(params.get('promo') === 'true');
  const [bestSeller, setBestSeller] = useState(params.get('bestSeller') === 'true');
  const [sort, setSort] = useState(params.get('sort') || 'newest');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams(searchQuery);
    setSearch(p.get('search') || '');
    setCategory(p.get('category') || '');
    setBrand(p.get('brand') || '');
    setPromo(p.get('promo') === 'true');
    setBestSeller(p.get('bestSeller') === 'true');
    setSort(p.get('sort') || 'newest');
    setPage(1);
  }, [searchQuery]);

  useEffect(() => {
    let active = true;
    async function fetchCatalog() {
      setLoading(true);
      try {
        const q = new URLSearchParams();
        if (search.trim()) q.set('search', search.trim());
        if (category) q.set('category', category);
        if (brand) q.set('brand', brand);
        if (minPrice) q.set('minPrice', minPrice);
        if (maxPrice) q.set('maxPrice', maxPrice);
        if (inStock) q.set('inStock', 'true');
        if (promo) q.set('promo', 'true');
        if (bestSeller) q.set('bestSeller', 'true');
        q.set('sort', sort);
        q.set('page', String(page));
        q.set('limit', '12');

        const res = await fetch(`/api/products?${q.toString()}`);
        const data = await res.json();
        if (!active) return;
        setItems(data.items || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      } catch (err) {
        console.error('Shop fetch error:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchCatalog();
    return () => {
      active = false;
    };
  }, [search, category, brand, minPrice, maxPrice, inStock, promo, bestSeller, sort, page]);

  const resetFilters = () => {
    setSearch('');
    setCategory('');
    setBrand('');
    setMinPrice('');
    setMaxPrice('');
    setInStock(false);
    setPromo(false);
    setBestSeller(false);
    setSort('newest');
    setPage(1);
    navigate('/boutique');
  };

  const FiltersPanel = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="shop-search" className="block text-xs font-semibold text-[#172B4D] mb-2">
          Rechercher
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="shop-search"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Nom, SKU, mot-clé..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#172B4D]"
          />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-[#172B4D] mb-2">Catégories</h3>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => {
              setCategory('');
              setPage(1);
            }}
            className={`w-full text-left px-3 py-1.5 rounded-lg text-sm ${
              category === ''
                ? 'bg-[#172B4D] text-white font-medium'
                : 'text-slate-600 hover:bg-[#F5F7FA]'
            }`}
          >
            Toutes les catégories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCategory(cat.slug);
                setPage(1);
              }}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm truncate ${
                category === cat.slug
                  ? 'bg-[#172B4D] text-white font-medium'
                  : 'text-slate-600 hover:bg-[#F5F7FA]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="brand-filter" className="block text-xs font-semibold text-[#172B4D] mb-2">
          Marque
        </label>
        <select
          id="brand-filter"
          value={brand}
          onChange={(e) => {
            setBrand(e.target.value);
            setPage(1);
          }}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Toutes les marques</option>
          {brands.map((b) => (
            <option key={b.id} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-[#172B4D] mb-2">Fourchette de prix (DH)</h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            aria-label="Prix minimum en DH"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value);
              setPage(1);
            }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono-num"
          />
          <input
            type="number"
            min={0}
            aria-label="Prix maximum en DH"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setPage(1);
            }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono-num"
          />
        </div>
      </div>

      <div className="space-y-2.5 pt-2 border-t border-slate-200">
        <label className="flex items-center gap-2.5 text-sm text-[#252B36] cursor-pointer">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => {
              setInStock(e.target.checked);
              setPage(1);
            }}
            className="rounded border-slate-300 text-[#172B4D]"
          />
          <span>En stock uniquement</span>
        </label>
        <label className="flex items-center gap-2.5 text-sm text-[#252B36] cursor-pointer">
          <input
            type="checkbox"
            checked={promo}
            onChange={(e) => {
              setPromo(e.target.checked);
              setPage(1);
            }}
            className="rounded border-slate-300 text-[#172B4D]"
          />
          <span>Promotions uniquement</span>
        </label>
        <label className="flex items-center gap-2.5 text-sm text-[#252B36] cursor-pointer">
          <input
            type="checkbox"
            checked={bestSeller}
            onChange={(e) => {
              setBestSeller(e.target.checked);
              setPage(1);
            }}
            className="rounded border-slate-300 text-[#172B4D]"
          />
          <span>Meilleures ventes</span>
        </label>
      </div>

      <button
        type="button"
        onClick={resetFilters}
        className="w-full py-2 border border-slate-300 rounded-lg text-xs font-semibold text-[#172B4D] hover:bg-[#F5F7FA]"
      >
        Réinitialiser les filtres
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 mb-8">
        <div>
          <p className="text-xs font-semibold text-[#F59E0B]">
            Catalogue en ligne · Données de démonstration configurables
          </p>
          <h1 className="font-display text-3xl font-bold text-[#172B4D] mt-1">
            Nos produits
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-medium text-[#172B4D]"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filtres</span>
          </button>

          <span className="text-xs text-slate-500 font-mono-num">
            {total} article{total > 1 ? 's' : ''}
          </span>

          <select
            aria-label="Trier les produits"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-[#172B4D]"
          >
            <option value="newest">Plus récents</option>
            <option value="popular">Popularité</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
            <option value="discount">Meilleures remises</option>
          </select>

          <div className="inline-flex border border-slate-300 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Vue grille"
              className={`p-2 ${viewMode === 'grid' ? 'bg-[#172B4D] text-white' : 'bg-white text-slate-600'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="Vue liste"
              className={`p-2 ${viewMode === 'list' ? 'bg-[#172B4D] text-white' : 'bg-white text-slate-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="hidden lg:block lg:col-span-3">
          <div className="bg-white border border-slate-200 rounded-xl p-5 sticky top-24">
            <FiltersPanel />
          </div>
        </aside>

        <div className="lg:col-span-9">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-80 bg-[#F5F7FA] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="bg-[#F5F7FA] border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <p className="font-display text-lg font-bold text-[#172B4D]">
                Aucun produit ne correspond à votre recherche
              </p>
              <p className="text-sm text-slate-600">
                Essayez d’élargir vos critères de filtre ou réinitialisez la recherche.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-5 py-2.5 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
              >
                Voir tout le catalogue
              </button>
            </div>
          ) : (
            <>
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'
                    : 'space-y-4'
                }
              >
                {items.map((p) => (
                  <ProductCard key={p.id} product={p} viewMode={viewMode} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium disabled:opacity-40"
                  >
                    Précédent
                  </button>
                  <span className="text-sm font-mono-num px-3">
                    Page {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium disabled:opacity-40"
                  >
                    Suivant
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-start lg:hidden">
          <div className="bg-white w-full max-w-xs h-full overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="font-display font-bold text-[#172B4D]">Filtres</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Fermer les filtres"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <FiltersPanel />
          </div>
        </div>
      )}
    </div>
  );
}
