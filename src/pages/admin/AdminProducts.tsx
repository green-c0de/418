import React, { useEffect, useState } from 'react';
import {
  Copy,
  Download,
  Edit3,
  FileSpreadsheet,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { formatMAD } from '../../lib/commerce';
import { useStore } from '../../context/StoreContext';
import { SafeImage } from '../../components/SafeImage';

export async function downloadAuthorizedFile(url: string, filename: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Téléchargement impossible.');
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objUrl);
}

export async function uploadImageFile(file: File, token: string): Promise<string> {
  const reader = new FileReader();
  const dataUrl: string = await new Promise((resolve, reject) => {
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });
  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ dataUrl, filename: file.name }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Échec du téléversement.');
  return json.url;
}

export function AdminProducts({
  token,
  activeSection,
}: {
  token: string;
  activeSection: 'products' | 'categories' | 'brands';
}) {
  const { refreshStorefront, showToast } = useStore();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Product modal state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [pForm, setPForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    categoryId: '',
    brandId: '',
    shortDescription: '',
    description: '',
    price: '',
    promoPrice: '',
    costPrice: '',
    stockQuantity: '10',
    alertThreshold: '5',
    weightGrams: '200',
    status: 'active',
    isFeatured: false,
    isBestSeller: false,
    isSample: false,
    promoExpiresAt: '',
    images: [''],
    specsText: '',
  });
  const [savingProduct, setSavingProduct] = useState(false);

  // Bulk import & bulk update modals
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [bulkPricePct, setBulkPricePct] = useState('');
  const [bulkStockDelta, setBulkStockDelta] = useState('');

  // Category modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any | null>(null);
  const [catForm, setCatForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    parentId: '',
    displayOrder: '0',
    isActive: true,
  });

  // Brand modal
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any | null>(null);
  const [brandForm, setBrandForm] = useState({
    name: '',
    description: '',
    logoUrl: '',
    isActive: true,
  });

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [pRes, cRes, bRes] = await Promise.all([
        fetch('/api/admin/products', { headers }),
        fetch('/api/admin/categories', { headers }),
        fetch('/api/admin/brands', { headers }),
      ]);
      if (pRes.ok) setProducts((await pRes.json()).items || []);
      if (cRes.ok) setCategories((await cRes.json()).items || []);
      if (bRes.ok) setBrands((await bRes.json()).items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openProductModal = (prod?: any) => {
    if (prod) {
      setEditingProduct(prod);
      const specsLines = Object.entries(prod.specifications || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      setPForm({
        name: prod.name || '',
        sku: prod.sku || '',
        barcode: prod.barcode || '',
        categoryId: prod.categoryId ? String(prod.categoryId) : '',
        brandId: prod.brandId ? String(prod.brandId) : '',
        shortDescription: prod.shortDescription || '',
        description: prod.description || '',
        price: prod.price || '',
        promoPrice: prod.promoPrice || '',
        costPrice: prod.costPrice || '',
        stockQuantity: String(prod.stockQuantity ?? 0),
        alertThreshold: String(prod.alertThreshold ?? 5),
        weightGrams: String(prod.weightGrams ?? 0),
        status: prod.status || 'active',
        isFeatured: Boolean(prod.isFeatured),
        isBestSeller: Boolean(prod.isBestSeller),
        isSample: Boolean(prod.isSample),
        promoExpiresAt: prod.promoExpiresAt
          ? new Date(prod.promoExpiresAt).toISOString().slice(0, 10)
          : '',
        images:
          prod.images && prod.images.length > 0
            ? prod.images.map((i: any) => i.url)
            : [prod.primaryImage || ''],
        specsText: specsLines,
      });
    } else {
      setEditingProduct(null);
      setPForm({
        name: '',
        sku: `LA-${Math.floor(1000 + Math.random() * 9000)}`,
        barcode: '',
        categoryId: categories[0]?.id ? String(categories[0].id) : '',
        brandId: brands[0]?.id ? String(brands[0].id) : '',
        shortDescription: '',
        description: '',
        price: '',
        promoPrice: '',
        costPrice: '',
        stockQuantity: '10',
        alertThreshold: '5',
        weightGrams: '200',
        status: 'active',
        isFeatured: false,
        isBestSeller: false,
        isSample: false,
        promoExpiresAt: '',
        images: [''],
        specsText: '',
      });
    }
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    try {
      const specifications: Record<string, string> = {};
      for (const line of pForm.specsText.split('\n')) {
        const idx = line.indexOf(':');
        if (idx > 0) {
          specifications[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
        }
      }

      const payload = {
        ...pForm,
        categoryId: pForm.categoryId ? Number(pForm.categoryId) : null,
        brandId: pForm.brandId ? Number(pForm.brandId) : null,
        images: pForm.images.map((u) => u.trim()).filter(Boolean),
        specifications,
        promoExpiresAt: pForm.promoExpiresAt || null,
      };

      const url = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur enregistrement produit.');

      showToast(editingProduct ? 'Produit mis à jour.' : 'Produit créé.');
      setProductModalOpen(false);
      await loadAll();
      refreshStorefront();
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDuplicate = async (id: number) => {
    const res = await fetch(`/api/admin/products/${id}/duplicate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showToast('Produit dupliqué (en brouillon).');
      loadAll();
    }
  };

  const handleDeleteProduct = async (id: number) => {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setConfirmDeleteId(null);
      showToast('Produit supprimé.');
      loadAll();
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/products/bulk-import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ csv: csvText }),
    });
    const json = await res.json();
    if (res.ok) {
      showToast(`${json.importedCount} produit(s) importé(s) ou mis à jour.`);
      setCsvModalOpen(false);
      setCsvText('');
      loadAll();
    } else {
      showToast(json.error || 'Erreur import CSV.');
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0) return;
    const res = await fetch('/api/admin/products/bulk-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        productIds: selectedIds,
        pricePercentChange: bulkPricePct ? Number(bulkPricePct) : 0,
        setStockDelta: bulkStockDelta ? Number(bulkStockDelta) : 0,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      showToast(`${json.updatedCount} produit(s) mis à jour.`);
      setSelectedIds([]);
      setBulkPricePct('');
      setBulkStockDelta('');
      loadAll();
    }
  };

  const downloadCsvTemplate = () => {
    const sample =
      'sku;nom;prix;prix_promo;stock;categorie;marque;description\nLA-NEW-01;Cahier 200 pages A4;24.00;19.50;40;cahiers-et-blocs-notes;oxford;Cahier grand format démonstration\n';
    const blob = new Blob(['\uFEFF' + sample], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modele-import-produits.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingCat
      ? `/api/admin/categories/${editingCat.id}`
      : '/api/admin/categories';
    const method = editingCat ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...catForm,
        parentId: catForm.parentId ? Number(catForm.parentId) : null,
        displayOrder: Number(catForm.displayOrder || 0),
      }),
    });
    if (res.ok) {
      showToast(editingCat ? 'Catégorie modifiée.' : 'Catégorie ajoutée.');
      setCatModalOpen(false);
      loadAll();
      refreshStorefront();
    }
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingBrand ? `/api/admin/brands/${editingBrand.id}` : '/api/admin/brands';
    const method = editingBrand ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(brandForm),
    });
    if (res.ok) {
      showToast(editingBrand ? 'Marque modifiée.' : 'Marque ajoutée.');
      setBrandModalOpen(false);
      loadAll();
      refreshStorefront();
    }
  };

  if (activeSection === 'categories') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#172B4D]">
              Gestion des catégories ({categories.length})
            </h2>
            <p className="text-xs text-[#252B36]/65">
              Organisez l’arborescence, l’ordre d’affichage et les visuels des rayons.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingCat(null);
              setCatForm({
                name: '',
                description: '',
                imageUrl: '',
                parentId: '',
                displayOrder: String(categories.length + 1),
                isActive: true,
              });
              setCatModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
          >
            <Plus className="w-4 h-4" /> Nouvelle catégorie
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-[#F5F7FA] border-b border-slate-200 text-xs text-[#252B36]/70">
                <th className="py-3 px-4 font-medium">Ordre</th>
                <th className="py-3 px-4 font-medium">Catégorie</th>
                <th className="py-3 px-4 font-medium">Slug</th>
                <th className="py-3 px-4 font-medium">Statut</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-[#F5F7FA]/50">
                  <td className="py-3 px-4 font-mono-num">{c.displayOrder}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <SafeImage
                        src={c.imageUrl}
                        alt={c.name}
                        className="w-10 h-10 rounded-lg object-cover bg-[#F5F7FA]"
                      />
                      <div>
                        <p className="font-semibold text-[#172B4D]">{c.name}</p>
                        <p className="text-xs text-[#252B36]/60 truncate max-w-xs">{c.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono-num text-xs text-[#252B36]/70">{c.slug}</td>
                  <td className="py-3 px-4 text-xs font-semibold">
                    {c.isActive ? (
                      <span className="text-emerald-700">Active</span>
                    ) : (
                      <span className="text-slate-400">Masquée</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCat(c);
                        setCatForm({
                          name: c.name,
                          description: c.description || '',
                          imageUrl: c.imageUrl || '',
                          parentId: c.parentId ? String(c.parentId) : '',
                          displayOrder: String(c.displayOrder ?? 0),
                          isActive: Boolean(c.isActive),
                        });
                        setCatModalOpen(true);
                      }}
                      className="p-1.5 text-[#172B4D] hover:bg-slate-100 rounded-lg"
                      title="Modifier"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/categories/${c.id}`, {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        showToast('Catégorie supprimée.');
                        loadAll();
                        refreshStorefront();
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {catModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <form
              onSubmit={handleSaveCategory}
              className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-[#172B4D]">
                  {editingCat ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                </h3>
                <button type="button" onClick={() => setCatModalOpen(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="Nom de la catégorie"
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <textarea
                rows={2}
                placeholder="Description"
                value={catForm.description}
                onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="URL de l'image"
                  value={catForm.imageUrl}
                  onChange={(e) => setCatForm({ ...catForm, imageUrl: e.target.value })}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
                <label className="px-3 py-2 bg-[#F5F7FA] border border-slate-300 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" /> Fichier
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await uploadImageFile(file, token);
                      setCatForm((f) => ({ ...f, imageUrl: url }));
                    }}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#252B36]/70">Ordre d’affichage</label>
                  <input
                    type="number"
                    value={catForm.displayOrder}
                    onChange={(e) => setCatForm({ ...catForm, displayOrder: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#252B36]/70">Catégorie parente</label>
                  <select
                    value={catForm.parentId}
                    onChange={(e) => setCatForm({ ...catForm, parentId: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Aucune (principale)</option>
                    {categories
                      .filter((c) => c.id !== editingCat?.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={catForm.isActive}
                  onChange={(e) => setCatForm({ ...catForm, isActive: e.target.checked })}
                />
                Catégorie active sur la boutique
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  if (activeSection === 'brands') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#172B4D]">
              Gestion des marques ({brands.length})
            </h2>
            <p className="text-xs text-[#252B36]/65">
              Marques disponibles pour le filtrage client et les fiches produits.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingBrand(null);
              setBrandForm({ name: '', description: '', logoUrl: '', isActive: true });
              setBrandModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
          >
            <Plus className="w-4 h-4" /> Nouvelle marque
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-[#F5F7FA] border-b border-slate-200 text-xs text-[#252B36]/70">
                <th className="py-3 px-4 font-medium">Marque</th>
                <th className="py-3 px-4 font-medium">Description</th>
                <th className="py-3 px-4 font-medium">Statut</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {brands.map((b) => (
                <tr key={b.id}>
                  <td className="py-3 px-4 font-semibold text-[#172B4D]">{b.name}</td>
                  <td className="py-3 px-4 text-[#252B36]/70">{b.description || '—'}</td>
                  <td className="py-3 px-4 text-xs font-semibold">
                    {b.isActive ? (
                      <span className="text-emerald-700">Active</span>
                    ) : (
                      <span className="text-slate-400">Inactive</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBrand(b);
                        setBrandForm({
                          name: b.name,
                          description: b.description || '',
                          logoUrl: b.logoUrl || '',
                          isActive: Boolean(b.isActive),
                        });
                        setBrandModalOpen(true);
                      }}
                      className="p-1.5 text-[#172B4D] hover:bg-slate-100 rounded-lg"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/brands/${b.id}`, {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        showToast('Marque supprimée.');
                        loadAll();
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

        {brandModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <form
              onSubmit={handleSaveBrand}
              className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-[#172B4D]">
                  {editingBrand ? 'Modifier la marque' : 'Nouvelle marque'}
                </h3>
                <button type="button" onClick={() => setBrandModalOpen(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="Nom de la marque"
                value={brandForm.name}
                onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <textarea
                rows={2}
                placeholder="Description"
                value={brandForm.description}
                onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={brandForm.isActive}
                  onChange={(e) => setBrandForm({ ...brandForm, isActive: e.target.checked })}
                />
                Marque active
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBrandModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // PRODUCTS SECTION
  const filteredProducts = products.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.categoryName || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-[#172B4D]">
            Gestion des produits ({products.length})
          </h2>
          <p className="text-xs text-[#252B36]/65">
            Créez, modifiez, importez par CSV et mettez à jour vos articles et tarifs en DH.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCsvModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 text-xs font-semibold text-[#172B4D] rounded-lg hover:bg-[#F5F7FA]"
          >
            <FileSpreadsheet className="w-4 h-4" /> Import CSV
          </button>
          <button
            type="button"
            onClick={() =>
              downloadAuthorizedFile(
                '/api/admin/products/export',
                'catalogue-librairie-amine.csv',
                token
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 text-xs font-semibold text-[#172B4D] rounded-lg hover:bg-[#F5F7FA]"
          >
            <Download className="w-4 h-4" /> Exporter CSV
          </button>
          <button
            type="button"
            onClick={() => openProductModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#172B4D] text-white text-xs font-semibold rounded-lg hover:opacity-95"
          >
            <Plus className="w-4 h-4 text-[#F59E0B]" /> Ajouter un produit
          </button>
        </div>
      </div>

      {/* Filters + Bulk Action Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, SKU ou catégorie..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="draft">Brouillons</option>
            <option value="archived">Archivés</option>
          </select>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 bg-[#F5F7FA] border border-slate-200 rounded-lg px-3 py-1.5">
            <span className="text-xs font-semibold text-[#172B4D]">
              {selectedIds.length} sélectionné(s)
            </span>
            <input
              type="number"
              placeholder="Prix %"
              value={bulkPricePct}
              onChange={(e) => setBulkPricePct(e.target.value)}
              className="w-20 border border-slate-300 rounded px-2 py-1 text-xs bg-white"
            />
            <input
              type="number"
              placeholder="Stock ±"
              value={bulkStockDelta}
              onChange={(e) => setBulkStockDelta(e.target.value)}
              className="w-20 border border-slate-300 rounded px-2 py-1 text-xs bg-white"
            />
            <button
              type="button"
              onClick={handleBulkUpdate}
              className="px-3 py-1 bg-[#172B4D] text-white text-xs font-semibold rounded"
            >
              Appliquer
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-[#F5F7FA] border-b border-slate-200 text-xs text-[#252B36]/70">
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={
                    filteredProducts.length > 0 &&
                    selectedIds.length === filteredProducts.length
                  }
                  onChange={(e) =>
                    setSelectedIds(e.target.checked ? filteredProducts.map((p) => p.id) : [])
                  }
                />
              </th>
              <th className="py-3 px-4 font-medium">Produit</th>
              <th className="py-3 px-4 font-medium">Catégorie · Marque</th>
              <th className="py-3 px-4 font-medium">Prix</th>
              <th className="py-3 px-4 font-medium">Stock</th>
              <th className="py-3 px-4 font-medium">Statut</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-slate-400">
                  Chargement des produits...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                  Aucun produit trouvé.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-[#F5F7FA]/50">
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.id)}
                      onChange={(e) =>
                        setSelectedIds((prev) =>
                          e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                        )
                      }
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <SafeImage
                        src={p.primaryImage}
                        alt={p.name}
                        className="w-11 h-11 rounded-lg object-cover bg-[#F5F7FA] shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-[#172B4D] truncate max-w-[240px]">
                          {p.name}
                        </p>
                        <p className="text-xs text-[#252B36]/60 font-mono-num">
                          {p.sku} {p.isSample ? '· Démo' : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-[#252B36]/80">
                    {p.categoryName} · {p.brandName}
                  </td>
                  <td className="py-3 px-4 font-mono-num">
                    {p.promoPrice ? (
                      <div>
                        <span className="font-bold text-[#172B4D]">
                          {formatMAD(p.promoPrice)}
                        </span>
                        <span className="block text-xs line-through text-slate-400">
                          {formatMAD(p.price)}
                        </span>
                      </div>
                    ) : (
                      <span className="font-semibold text-[#172B4D]">{formatMAD(p.price)}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono-num">
                    <span
                      className={
                        p.stockQuantity <= 0
                          ? 'text-red-600 font-bold'
                          : p.stockQuantity <= p.alertThreshold
                            ? 'text-amber-600 font-semibold'
                            : 'text-[#252B36]'
                      }
                    >
                      {p.stockQuantity}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs font-semibold">
                    {p.status === 'active'
                      ? 'Actif'
                      : p.status === 'draft'
                        ? 'Brouillon'
                        : 'Archivé'}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openProductModal(p)}
                      className="p-1.5 text-[#172B4D] hover:bg-slate-100 rounded-lg"
                      title="Modifier"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(p.id)}
                      className="p-1.5 text-[#252B36]/70 hover:bg-slate-100 rounded-lg"
                      title="Dupliquer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {confirmDeleteId === p.id ? (
                      <span className="inline-flex items-center gap-1 ml-1 text-xs">
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id)}
                          className="text-red-600 font-bold underline"
                        >
                          Confirmer
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-slate-500"
                        >
                          Non
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(p.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Product Create/Edit Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-bold text-[#172B4D]">
                {editingProduct ? `Modifier : ${editingProduct.name}` : 'Nouveau produit'}
              </h3>
              <button type="button" onClick={() => setProductModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#172B4D] mb-1">
                  Nom du produit *
                </label>
                <input
                  type="text"
                  required
                  value={pForm.name}
                  onChange={(e) => setPForm({ ...pForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#172B4D] mb-1">
                  Référence SKU *
                </label>
                <input
                  type="text"
                  required
                  value={pForm.sku}
                  onChange={(e) => setPForm({ ...pForm, sku: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono-num"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#172B4D] mb-1">
                  Code-barres (optionnel)
                </label>
                <input
                  type="text"
                  value={pForm.barcode}
                  onChange={(e) => setPForm({ ...pForm, barcode: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono-num"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#172B4D] mb-1">Catégorie</label>
                <select
                  value={pForm.categoryId}
                  onChange={(e) => setPForm({ ...pForm, categoryId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="">Sans catégorie</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#172B4D] mb-1">Marque</label>
                <select
                  value={pForm.brandId}
                  onChange={(e) => setPForm({ ...pForm, brandId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="">Sans marque</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#172B4D] mb-1">
                  Prix de vente (DH) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={pForm.price}
                  onChange={(e) => setPForm({ ...pForm, price: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono-num"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#172B4D] mb-1">
                  Prix promotionnel (DH)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pForm.promoPrice}
                  onChange={(e) => setPForm({ ...pForm, promoPrice: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono-num"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#172B4D] mb-1">
                  Prix d’achat (DH)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pForm.costPrice}
                  onChange={(e) => setPForm({ ...pForm, costPrice: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono-num"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#172B4D] mb-1">
                  Date fin promotion
                </label>
                <input
                  type="date"
                  value={pForm.promoExpiresAt}
                  onChange={(e) => setPForm({ ...pForm, promoExpiresAt: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#172B4D] mb-1">
                  Quantité en stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={pForm.stockQuantity}
                  onChange={(e) => setPForm({ ...pForm, stockQuantity: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono-num"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#172B4D] mb-1">
                  Seuil d’alerte stock faible
                </label>
                <input
                  type="number"
                  min="0"
                  value={pForm.alertThreshold}
                  onChange={(e) => setPForm({ ...pForm, alertThreshold: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono-num"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#172B4D] mb-1">Poids (g)</label>
                <input
                  type="number"
                  min="0"
                  value={pForm.weightGrams}
                  onChange={(e) => setPForm({ ...pForm, weightGrams: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono-num"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#172B4D] mb-1">Statut</label>
                <select
                  value={pForm.status}
                  onChange={(e) => setPForm({ ...pForm, status: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="active">Actif</option>
                  <option value="draft">Brouillon</option>
                  <option value="archived">Archivé</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#172B4D] mb-1">
                Résumé court
              </label>
              <input
                type="text"
                value={pForm.shortDescription}
                onChange={(e) => setPForm({ ...pForm, shortDescription: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#172B4D] mb-1">
                Description détaillée
              </label>
              <textarea
                rows={3}
                value={pForm.description}
                onChange={(e) => setPForm({ ...pForm, description: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#172B4D] mb-1">
                Caractéristiques techniques (une par ligne : Clé: Valeur)
              </label>
              <textarea
                rows={3}
                placeholder="Format: A4 (21 x 29,7 cm)&#10;Grammage: 90 g/m²"
                value={pForm.specsText}
                onChange={(e) => setPForm({ ...pForm, specsText: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#172B4D]">
                  Images produit (URL ou téléversement)
                </label>
                <button
                  type="button"
                  onClick={() => setPForm((f) => ({ ...f, images: [...f.images, ''] }))}
                  className="text-xs font-semibold text-[#172B4D] underline"
                >
                  + Ajouter une image
                </button>
              </div>
              {pForm.images.map((imgUrl, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="/src/assets/images/... ou https://..."
                    value={imgUrl}
                    onChange={(e) => {
                      const next = [...pForm.images];
                      next[idx] = e.target.value;
                      setPForm({ ...pForm, images: next });
                    }}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                  />
                  <label className="px-3 py-1.5 bg-[#F5F7FA] border border-slate-300 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" /> Importer
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const uploaded = await uploadImageFile(file, token);
                        const next = [...pForm.images];
                        next[idx] = uploaded;
                        setPForm({ ...pForm, images: next });
                      }}
                    />
                  </label>
                  {pForm.images.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPForm({
                          ...pForm,
                          images: pForm.images.filter((_, i) => i !== idx),
                        })
                      }
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-6 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pForm.isFeatured}
                  onChange={(e) => setPForm({ ...pForm, isFeatured: e.target.checked })}
                />
                Produit mis en avant
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pForm.isBestSeller}
                  onChange={(e) => setPForm({ ...pForm, isBestSeller: e.target.checked })}
                />
                Meilleure vente
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pForm.isSample}
                  onChange={(e) => setPForm({ ...pForm, isSample: e.target.checked })}
                />
                Article de démonstration
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={savingProduct}
                className="px-6 py-2 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
              >
                {savingProduct ? 'Enregistrement...' : 'Enregistrer le produit'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CSV Import Modal */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleBulkImport}
            className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-[#172B4D]">
                Importation en masse (CSV)
              </h3>
              <button type="button" onClick={() => setCsvModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#252B36]/75">
              Colonnes attendues :{' '}
              <span className="font-mono-num">
                sku;nom;prix;prix_promo;stock;categorie;marque;description
              </span>
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={downloadCsvTemplate}
                className="text-xs font-semibold text-[#172B4D] underline"
              >
                Télécharger un modèle CSV
              </button>
              <label className="text-xs font-semibold text-[#172B4D] underline cursor-pointer">
                Charger un fichier .csv
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setCsvText(await f.text());
                  }}
                />
              </label>
            </div>
            <textarea
              rows={7}
              required
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Collez le contenu CSV ici..."
              className="w-full border border-slate-300 rounded-lg p-3 text-xs font-mono-num"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCsvModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
              >
                Importer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
