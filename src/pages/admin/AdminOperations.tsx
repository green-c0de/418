import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  formatDateFR,
  formatMAD,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../../lib/commerce';
import { useStore } from '../../context/StoreContext';

export function AdminOperations({
  token,
  activeSection,
}: {
  token: string;
  activeSection: 'customers' | 'inventory' | 'suppliers' | 'delivery' | 'payments';
}) {
  const { settings, refreshStorefront, showToast } = useStore();

  // Customers state
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [custNotes, setCustNotes] = useState('');

  // Inventory & Suppliers state
  const [invProducts, setInvProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [movModal, setMovModal] = useState(false);
  const [movForm, setMovForm] = useState({
    productId: '',
    supplierId: '',
    movementType: 'in',
    quantity: '10',
    reason: 'Réapprovisionnement fournisseur',
  });
  const [supModal, setSupModal] = useState(false);
  const [supForm, setSupForm] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    notes: '',
  });

  // Delivery zones state
  const [zones, setZones] = useState<any[]>([]);
  const [zoneModal, setZoneModal] = useState(false);
  const [editingZone, setEditingZone] = useState<any | null>(null);
  const [zoneForm, setZoneForm] = useState({
    name: '',
    city: 'Aït Melloul',
    fee: '0.00',
    minOrderAmount: '0.00',
    estimatedDelay: '24h à 48h',
    isStorePickup: false,
    isActive: true,
  });
  const [freeThreshold, setFreeThreshold] = useState(
    String(settings?.delivery?.freeDeliveryThreshold ?? '')
  );

  // Payments state
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [paySettings, setPaySettings] = useState(settings?.payment || null);
  const [manualPayModal, setManualPayModal] = useState(false);
  const [allOrdersMini, setAllOrdersMini] = useState<any[]>([]);
  const [manualPayForm, setManualPayForm] = useState({
    orderId: '',
    method: 'cod',
    amount: '',
    status: 'paid',
    reference: '',
    notes: '',
  });

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const loadSectionData = async () => {
    if (activeSection === 'customers') {
      const res = await fetch('/api/admin/customers', { headers });
      if (res.ok) setCustomers((await res.json()).items || []);
    } else if (activeSection === 'inventory' || activeSection === 'suppliers') {
      const res = await fetch('/api/admin/inventory', { headers });
      if (res.ok) {
        const json = await res.json();
        setInvProducts(json.products || []);
        setMovements(json.movements || []);
        setSuppliers(json.suppliers || []);
        if (json.products?.[0] && !movForm.productId) {
          setMovForm((f) => ({ ...f, productId: String(json.products[0].id) }));
        }
      }
    } else if (activeSection === 'delivery') {
      const res = await fetch('/api/admin/delivery-zones', { headers });
      if (res.ok) setZones((await res.json()).items || []);
      setFreeThreshold(
        settings?.delivery?.freeDeliveryThreshold
          ? String(settings.delivery.freeDeliveryThreshold)
          : ''
      );
    } else if (activeSection === 'payments') {
      const [pRes, oRes] = await Promise.all([
        fetch('/api/admin/payments', { headers }),
        fetch('/api/admin/orders', { headers }),
      ]);
      if (pRes.ok) setPaymentsList((await pRes.json()).items || []);
      if (oRes.ok) {
        const ordJson = await oRes.json();
        setAllOrdersMini(ordJson.items || []);
        if (ordJson.items?.[0] && !manualPayForm.orderId) {
          setManualPayForm((f) => ({
            ...f,
            orderId: String(ordJson.items[0].id),
            amount: String(ordJson.items[0].totalAmount),
          }));
        }
      }
      if (settings?.payment) setPaySettings(settings.payment);
    }
  };

  useEffect(() => {
    loadSectionData();
  }, [activeSection, settings]);

  // 1. CUSTOMERS
  if (activeSection === 'customers') {
    return (
      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="font-display text-lg font-bold text-[#172B4D]">
            Gestion des clients ({customers.length})
          </h2>
          <p className="text-xs text-[#252B36]/65">
            Consultez l’historique d’achats, le total dépensé et le statut des comptes clients.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-[#F5F7FA] border-b border-slate-200 text-xs text-[#252B36]/70">
                <th className="py-3 px-4 font-medium">Client</th>
                <th className="py-3 px-4 font-medium">Téléphone · Ville</th>
                <th className="py-3 px-4 font-medium">Commandes</th>
                <th className="py-3 px-4 font-medium">Total dépensé</th>
                <th className="py-3 px-4 font-medium">Compte</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-[#F5F7FA]/50">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-[#172B4D]">{c.fullName}</p>
                    <p className="text-xs text-[#252B36]/60">{c.email}</p>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <p>{c.phone || '—'}</p>
                    <p className="text-[#252B36]/60">{c.defaultCity}</p>
                  </td>
                  <td className="py-3 px-4 font-mono-num">{c.ordersCount}</td>
                  <td className="py-3 px-4 font-mono-num font-semibold text-[#172B4D]">
                    {formatMAD(c.totalSpent)}
                  </td>
                  <td className="py-3 px-4 text-xs font-semibold">
                    {c.isActive ? (
                      <span className="text-emerald-700">Actif</span>
                    ) : (
                      <span className="text-red-600">Désactivé</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustNotes(c.notes || '');
                      }}
                      className="text-xs font-semibold text-[#172B4D] underline"
                    >
                      Détails & notes
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/customers/${c.id}`, {
                          method: 'PUT',
                          headers,
                          body: JSON.stringify({ isActive: !c.isActive }),
                        });
                        showToast(c.isActive ? 'Compte client désactivé.' : 'Compte activé.');
                        loadSectionData();
                      }}
                      className="text-xs text-[#252B36]/70 underline"
                    >
                      {c.isActive ? 'Désactiver' : 'Activer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedCustomer && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-[#172B4D]">
                  {selectedCustomer.fullName}
                </h3>
                <button type="button" onClick={() => setSelectedCustomer(null)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-xs space-y-1 text-[#252B36]/80">
                <p>E-mail : {selectedCustomer.email}</p>
                <p>Inscrit le : {formatDateFR(selectedCustomer.createdAt)}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#172B4D] mb-1">
                  Notes internes administrateur
                </label>
                <textarea
                  rows={3}
                  value={custNotes}
                  onChange={(e) => setCustNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/admin/customers/${selectedCustomer.id}`, {
                      method: 'PUT',
                      headers,
                      body: JSON.stringify({ notes: custNotes }),
                    });
                    showToast('Notes enregistrées.');
                    setSelectedCustomer(null);
                    loadSectionData();
                  }}
                  className="mt-2 px-4 py-1.5 bg-[#172B4D] text-white text-xs font-semibold rounded-lg"
                >
                  Sauvegarder la note
                </button>
              </div>
              <div>
                <p className="text-xs font-bold text-[#172B4D] mb-2">
                  Historique des commandes ({selectedCustomer.orders?.length || 0})
                </p>
                <div className="space-y-2">
                  {(selectedCustomer.orders || []).map((o: any) => (
                    <div
                      key={o.id}
                      className="flex justify-between text-xs bg-[#F5F7FA] p-2.5 rounded-lg"
                    >
                      <span className="font-mono-num font-semibold">{o.orderNumber}</span>
                      <span>{formatDateFR(o.createdAt)}</span>
                      <span className="font-mono-num font-bold">{formatMAD(o.totalAmount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. INVENTORY
  if (activeSection === 'inventory') {
    const lowOrOut = invProducts.filter((p) => p.stockQuantity <= p.alertThreshold);
    return (
      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[#172B4D]">
              Gestion du stock en temps réel
            </h2>
            <p className="text-xs text-[#252B36]/65">
              {lowOrOut.length} article(s) en alerte de stock faible ou rupture.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMovModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#172B4D] text-white text-xs font-semibold rounded-lg"
          >
            <Plus className="w-4 h-4 text-[#F59E0B]" /> Mouvement de stock
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="font-display text-sm font-bold text-[#172B4D] mb-3">
              Niveaux actuels (du plus bas au plus élevé)
            </h3>
            <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100 text-sm">
              {invProducts.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-[#172B4D] truncate">{p.name}</p>
                    <p className="text-xs text-[#252B36]/60 font-mono-num">
                      {p.sku} · Seuil alerte : {p.alertThreshold}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`font-mono-num font-bold ${
                        p.stockQuantity <= 0
                          ? 'text-red-600'
                          : p.stockQuantity <= p.alertThreshold
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                      }`}
                    >
                      {p.stockQuantity} u.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="font-display text-sm font-bold text-[#172B4D] mb-3">
              Journal des mouvements de stock
            </h3>
            <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100 text-xs">
              {movements.map((m) => (
                <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#172B4D]">{m.reason}</p>
                    <p className="text-[#252B36]/60 font-mono-num">
                      {formatDateFR(m.createdAt)} · {m.createdBy}
                    </p>
                  </div>
                  <div className="text-right font-mono-num shrink-0">
                    <span
                      className={`font-bold ${
                        m.quantityDelta >= 0 ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {m.quantityDelta >= 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                    </span>
                    <span className="block text-[#252B36]/60">
                      {m.previousStock} → {m.newStock}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {movModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await fetch('/api/admin/inventory/movement', {
                  method: 'POST',
                  headers,
                  body: JSON.stringify(movForm),
                });
                const json = await res.json();
                if (res.ok) {
                  showToast(`Stock mis à jour (nouveau niveau : ${json.newStock}).`);
                  setMovModal(false);
                  loadSectionData();
                } else {
                  showToast(json.error || 'Erreur');
                }
              }}
              className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-[#172B4D]">
                  Enregistrer un mouvement de stock
                </h3>
                <button type="button" onClick={() => setMovModal(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div>
                <label className="text-xs font-medium text-[#172B4D]">Produit</label>
                <select
                  value={movForm.productId}
                  onChange={(e) => setMovForm({ ...movForm, productId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white mt-1"
                >
                  {invProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.stockQuantity})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#172B4D]">Type</label>
                  <select
                    value={movForm.movementType}
                    onChange={(e) => setMovForm({ ...movForm, movementType: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white mt-1"
                  >
                    <option value="in">Entrée (+)</option>
                    <option value="out">Sortie (-)</option>
                    <option value="adjustment">Nouveau stock exact</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#172B4D]">Quantité</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={movForm.quantity}
                    onChange={(e) => setMovForm({ ...movForm, quantity: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1 font-mono-num"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#172B4D]">Fournisseur (optionnel)</label>
                <select
                  value={movForm.supplierId}
                  onChange={(e) => setMovForm({ ...movForm, supplierId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white mt-1"
                >
                  <option value="">Aucun</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#172B4D]">Motif</label>
                <input
                  type="text"
                  required
                  value={movForm.reason}
                  onChange={(e) => setMovForm({ ...movForm, reason: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMovModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
                >
                  Valider
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // 3. SUPPLIERS
  if (activeSection === 'suppliers') {
    return (
      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[#172B4D]">
              Fournisseurs ({suppliers.length})
            </h2>
            <p className="text-xs text-[#252B36]/65">
              Répertoire des grossistes et partenaires d’approvisionnement.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSupModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#172B4D] text-white text-xs font-semibold rounded-lg"
          >
            <Plus className="w-4 h-4 text-[#F59E0B]" /> Ajouter un fournisseur
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-[#F5F7FA] border-b border-slate-200 text-xs text-[#252B36]/70">
                <th className="py-3 px-4">Fournisseur</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Ville</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    Aucun fournisseur enregistré.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 px-4 font-semibold text-[#172B4D]">{s.name}</td>
                    <td className="py-3 px-4 text-xs">
                      {s.contactName} {s.phone ? `· ${s.phone}` : ''}
                    </td>
                    <td className="py-3 px-4 text-xs">{s.city || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/admin/suppliers/${s.id}`, {
                            method: 'DELETE',
                            headers,
                          });
                          showToast('Fournisseur supprimé.');
                          loadSectionData();
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {supModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await fetch('/api/admin/suppliers', {
                  method: 'POST',
                  headers,
                  body: JSON.stringify(supForm),
                });
                if (res.ok) {
                  showToast('Fournisseur ajouté.');
                  setSupModal(false);
                  setSupForm({
                    name: '',
                    contactName: '',
                    phone: '',
                    email: '',
                    city: '',
                    address: '',
                    notes: '',
                  });
                  loadSectionData();
                }
              }}
              className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-[#172B4D]">Nouveau fournisseur</h3>
                <button type="button" onClick={() => setSupModal(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="Raison sociale / Nom *"
                value={supForm.name}
                onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Nom du responsable"
                value={supForm.contactName}
                onChange={(e) => setSupForm({ ...supForm, contactName: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Téléphone"
                  value={supForm.phone}
                  onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Ville"
                  value={supForm.city}
                  onChange={(e) => setSupForm({ ...supForm, city: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSupModal(false)}
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

  // 4. DELIVERY ZONES
  if (activeSection === 'delivery') {
    return (
      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[#172B4D]">
              Gestion des livraisons et zones
            </h2>
            <p className="text-xs text-[#252B36]/65">
              Définissez les frais par ville (0,00 DH par défaut jusqu’à configuration), les délais et le seuil de gratuité.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingZone(null);
              setZoneForm({
                name: '',
                city: '',
                fee: '0.00',
                minOrderAmount: '0.00',
                estimatedDelay: '24h à 48h',
                isStorePickup: false,
                isActive: true,
              });
              setZoneModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#172B4D] text-white text-xs font-semibold rounded-lg"
          >
            <Plus className="w-4 h-4 text-[#F59E0B]" /> Nouvelle zone
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-[#172B4D] mb-1">
              Seuil de livraison gratuite (DH — laisser vide pour désactiver)
            </label>
            <input
              type="number"
              min="0"
              value={freeThreshold}
              onChange={(e) => setFreeThreshold(e.target.value)}
              placeholder="Ex : 300"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono-num w-64"
            />
          </div>
          <button
            type="button"
            onClick={async () => {
              await fetch('/api/admin/settings/delivery', {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                  ...(settings?.delivery || {}),
                  freeDeliveryThreshold: freeThreshold ? Number(freeThreshold) : null,
                }),
              });
              showToast('Seuil de livraison mis à jour.');
              refreshStorefront();
            }}
            className="px-4 py-2 bg-[#172B4D] text-white text-xs font-semibold rounded-lg"
          >
            Enregistrer le seuil
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-[#F5F7FA] border-b border-slate-200 text-xs text-[#252B36]/70">
                <th className="py-3 px-4">Zone</th>
                <th className="py-3 px-4">Ville</th>
                <th className="py-3 px-4">Frais</th>
                <th className="py-3 px-4">Délai</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {zones.map((z) => (
                <tr key={z.id}>
                  <td className="py-3 px-4 font-semibold text-[#172B4D]">
                    {z.name} {z.isStorePickup ? '· Retrait magasin' : ''}
                  </td>
                  <td className="py-3 px-4">{z.city}</td>
                  <td className="py-3 px-4 font-mono-num font-semibold">{formatMAD(z.fee)}</td>
                  <td className="py-3 px-4 text-xs">{z.estimatedDelay}</td>
                  <td className="py-3 px-4 text-xs font-semibold">
                    {z.isActive ? (
                      <span className="text-emerald-700">Active</span>
                    ) : (
                      <span className="text-slate-400">Inactive</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingZone(z);
                        setZoneForm({
                          name: z.name,
                          city: z.city,
                          fee: z.fee,
                          minOrderAmount: z.minOrderAmount,
                          estimatedDelay: z.estimatedDelay,
                          isStorePickup: Boolean(z.isStorePickup),
                          isActive: Boolean(z.isActive),
                        });
                        setZoneModal(true);
                      }}
                      className="text-xs font-semibold text-[#172B4D] underline"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/delivery-zones/${z.id}`, {
                          method: 'DELETE',
                          headers,
                        });
                        showToast('Zone supprimée.');
                        loadSectionData();
                        refreshStorefront();
                      }}
                      className="text-xs text-red-600 underline"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {zoneModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const url = editingZone
                  ? `/api/admin/delivery-zones/${editingZone.id}`
                  : '/api/admin/delivery-zones';
                const res = await fetch(url, {
                  method: editingZone ? 'PUT' : 'POST',
                  headers,
                  body: JSON.stringify(zoneForm),
                });
                if (res.ok) {
                  showToast('Zone enregistrée.');
                  setZoneModal(false);
                  loadSectionData();
                  refreshStorefront();
                }
              }}
              className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-[#172B4D]">
                  {editingZone ? 'Modifier la zone' : 'Nouvelle zone de livraison'}
                </h3>
                <button type="button" onClick={() => setZoneModal(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="Nom de la zone (ex: Agadir Centre)"
                value={zoneForm.name}
                onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="text"
                required
                placeholder="Ville"
                value={zoneForm.city}
                onChange={(e) => setZoneForm({ ...zoneForm, city: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#252B36]/70">Frais (DH)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={zoneForm.fee}
                    onChange={(e) => setZoneForm({ ...zoneForm, fee: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono-num"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#252B36]/70">Délai estimé</label>
                  <input
                    type="text"
                    value={zoneForm.estimatedDelay}
                    onChange={(e) => setZoneForm({ ...zoneForm, estimatedDelay: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={zoneForm.isStorePickup}
                  onChange={(e) => setZoneForm({ ...zoneForm, isStorePickup: e.target.checked })}
                />
                Retrait en magasin
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={zoneForm.isActive}
                  onChange={(e) => setZoneForm({ ...zoneForm, isActive: e.target.checked })}
                />
                Zone active
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setZoneModal(false)}
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

  // 5. PAYMENTS
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-[#172B4D]">
            Gestion des paiements et modes de règlement
          </h2>
          <p className="text-xs text-[#252B36]/65">
            Activez ou configurez les moyens de paiement marocains et enregistrez les règlements manuels.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setManualPayModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#172B4D] text-white text-xs font-semibold rounded-lg"
        >
          <Plus className="w-4 h-4 text-[#F59E0B]" /> Enregistrer un paiement / remboursement
        </button>
      </div>

      {paySettings && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="font-display text-sm font-bold text-[#172B4D]">
            Modes de paiement activés sur la boutique
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="border border-slate-200 rounded-xl p-4 space-y-2">
              <label className="flex items-center gap-2 font-semibold text-[#172B4D]">
                <input
                  type="checkbox"
                  checked={paySettings.codEnabled}
                  onChange={(e) =>
                    setPaySettings({ ...paySettings, codEnabled: e.target.checked })
                  }
                />
                Paiement à la livraison (COD)
              </label>
              <input
                type="text"
                value={paySettings.codInstructions}
                onChange={(e) =>
                  setPaySettings({ ...paySettings, codInstructions: e.target.value })
                }
                placeholder="Instructions COD"
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
              />
            </div>

            <div className="border border-slate-200 rounded-xl p-4 space-y-2">
              <label className="flex items-center gap-2 font-semibold text-[#172B4D]">
                <input
                  type="checkbox"
                  checked={paySettings.onlineEnabled}
                  onChange={(e) =>
                    setPaySettings({ ...paySettings, onlineEnabled: e.target.checked })
                  }
                />
                Paiement en ligne (CMI / Payzone)
              </label>
              <input
                type="text"
                value={paySettings.onlineProvider}
                onChange={(e) =>
                  setPaySettings({ ...paySettings, onlineProvider: e.target.value })
                }
                placeholder="Passerelle (CMI / Payzone)"
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
              />
              <input
                type="text"
                value={paySettings.onlineMerchantId}
                onChange={(e) =>
                  setPaySettings({ ...paySettings, onlineMerchantId: e.target.value })
                }
                placeholder="Identifiant marchand (à configurer)"
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
              />
            </div>

            <div className="border border-slate-200 rounded-xl p-4 space-y-2">
              <label className="flex items-center gap-2 font-semibold text-[#172B4D]">
                <input
                  type="checkbox"
                  checked={paySettings.bankTransferEnabled}
                  onChange={(e) =>
                    setPaySettings({ ...paySettings, bankTransferEnabled: e.target.checked })
                  }
                />
                Virement bancaire
              </label>
              <textarea
                rows={2}
                value={paySettings.bankTransferInstructions}
                onChange={(e) =>
                  setPaySettings({
                    ...paySettings,
                    bankTransferInstructions: e.target.value,
                  })
                }
                placeholder="RIB et instructions de virement"
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await fetch('/api/admin/settings/payment', {
                method: 'PUT',
                headers,
                body: JSON.stringify(paySettings),
              });
              showToast('Paramètres de paiement sauvegardés.');
              refreshStorefront();
            }}
            className="px-5 py-2 bg-[#172B4D] text-white text-xs font-semibold rounded-lg"
          >
            Sauvegarder les modes de paiement
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-[#F5F7FA] border-b border-slate-200 text-xs text-[#252B36]/70">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Commande</th>
              <th className="py-3 px-4">Client</th>
              <th className="py-3 px-4">Méthode</th>
              <th className="py-3 px-4">Statut</th>
              <th className="py-3 px-4 text-right">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paymentsList.map((p) => (
              <tr key={p.id}>
                <td className="py-3 px-4 font-mono-num text-xs">{formatDateFR(p.createdAt)}</td>
                <td className="py-3 px-4 font-mono-num font-semibold text-[#172B4D]">
                  {p.orderNumber}
                </td>
                <td className="py-3 px-4">{p.customerName}</td>
                <td className="py-3 px-4 text-xs">
                  {PAYMENT_METHOD_LABELS[p.method] || p.method}
                </td>
                <td className="py-3 px-4 text-xs font-semibold">
                  {PAYMENT_STATUS_LABELS[p.status] || p.status}
                </td>
                <td className="py-3 px-4 text-right font-mono-num font-bold text-[#172B4D]">
                  {formatMAD(p.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {manualPayModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetch('/api/admin/payments/manual', {
                method: 'POST',
                headers,
                body: JSON.stringify(manualPayForm),
              });
              if (res.ok) {
                showToast('Transaction enregistrée.');
                setManualPayModal(false);
                loadSectionData();
              }
            }}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-[#172B4D]">
                Paiement / Remboursement manuel
              </h3>
              <button type="button" onClick={() => setManualPayModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="text-xs font-medium text-[#172B4D]">Commande</label>
              <select
                value={manualPayForm.orderId}
                onChange={(e) => {
                  const ord = allOrdersMini.find((o) => String(o.id) === e.target.value);
                  setManualPayForm({
                    ...manualPayForm,
                    orderId: e.target.value,
                    amount: ord ? String(ord.totalAmount) : manualPayForm.amount,
                  });
                }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white mt-1"
              >
                {allOrdersMini.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} — {o.customerName} ({formatMAD(o.totalAmount)})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#172B4D]">Montant (DH)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={manualPayForm.amount}
                  onChange={(e) => setManualPayForm({ ...manualPayForm, amount: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono-num mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#172B4D]">Statut</label>
                <select
                  value={manualPayForm.status}
                  onChange={(e) => setManualPayForm({ ...manualPayForm, status: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white mt-1"
                >
                  <option value="paid">Payé</option>
                  <option value="refunded">Remboursé</option>
                  <option value="pending">En attente</option>
                </select>
              </div>
            </div>
            <input
              type="text"
              placeholder="Référence bordereau / virement"
              value={manualPayForm.reference}
              onChange={(e) => setManualPayForm({ ...manualPayForm, reference: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setManualPayModal(false)}
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
