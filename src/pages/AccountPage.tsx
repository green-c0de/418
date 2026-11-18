import React, { useEffect, useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { Heart, LogOut, MapPin, Package, Plus, ShoppingCart, Trash2, User } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatDateFR, formatMAD, ORDER_STATUS_LABELS, OrderStatus } from '../lib/commerce';
import { auth, googleAuthProvider } from '../lib/firebase';
import { SafeImage } from '../components/SafeImage';

export function AccountPage() {
  const {
    user,
    token,
    setSession,
    logout,
    navigate,
    searchQuery,
    showToast,
    addToCart,
    toggleWishlist,
  } = useStore();

  const urlTab = new URLSearchParams(searchQuery).get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(urlTab);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'recover'>('login');

  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Account data states
  const [accountData, setAccountData] = useState<{
    profile: any;
    addresses: any[];
    orders: any[];
    wishlist: any[];
  } | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);

  const [profName, setProfName] = useState('');
  const [profPhone, setProfPhone] = useState('');
  const [profCity, setProfCity] = useState('Aït Melloul');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [addrLabel, setAddrLabel] = useState('Domicile');
  const [addrName, setAddrName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrCity, setAddrCity] = useState('Aït Melloul');
  const [addrLine, setAddrLine] = useState('');

  useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab]);

  const fetchAccount = async (authToken: string) => {
    setLoadingAccount(true);
    try {
      const res = await fetch('/api/account/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        if (res.status === 401) setSession(null, null);
        return;
      }
      const data = await res.json();
      setAccountData(data);
      setProfName(data.user?.fullName || '');
      setProfPhone(data.user?.phone || '');
      setProfCity(data.profile?.defaultCity || 'Aït Melloul');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAccount(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAccount(token);
    } else {
      setAccountData(null);
    }
  }, [token]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthMessage(null);
    setSubmitting(true);
    try {
      if (authMode === 'recover') {
        const res = await fetch('/api/auth/recover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setAuthMessage(data.message);
        return;
      }

      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          authMode === 'register' ? { email, password, fullName, phone } : { email, password }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec de l’authentification');
      setSession(data.token, data.user);
      showToast(`Bienvenue, ${data.user.fullName}`);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setSubmitting(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec connexion Google');
      setSession(data.token, data.user);
      showToast(`Connecté avec Google (${data.user.email})`);
    } catch (err: any) {
      setAuthError(err.message || 'Connexion Google annulée ou impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const res = await fetch('/api/account/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fullName: profName, phone: profPhone, defaultCity: profCity }),
    });
    const data = await res.json();
    if (res.ok) {
      setSession(token, data.user);
      showToast('Profil mis à jour.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const res = await fetch('/api/account/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      setCurrentPassword('');
      setNewPassword('');
      showToast('Mot de passe modifié.');
    } else {
      showToast(data.error || 'Erreur');
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const res = await fetch('/api/account/addresses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        label: addrLabel,
        fullName: addrName || user?.fullName,
        phone: addrPhone || user?.phone,
        city: addrCity,
        addressLine: addrLine,
        isDefault: true,
      }),
    });
    if (res.ok) {
      setAddrLine('');
      fetchAccount(token);
      showToast('Adresse enregistrée.');
    }
  };

  const handleDeleteAddress = async (id: number) => {
    if (!token) return;
    await fetch(`/api/account/addresses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchAccount(token);
  };

  if (!user || !token) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold text-[#172B4D]">
              {authMode === 'login'
                ? 'Connexion client'
                : authMode === 'register'
                  ? 'Créer un compte'
                  : 'Mot de passe oublié'}
            </h1>
            <p className="text-sm text-slate-600">
              Accédez à vos commandes, adresses enregistrées et liste de souhaits.
            </p>
          </div>

          <div className="flex gap-1 p-1 bg-[#F5F7FA] rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthError(null);
              }}
              className={`flex-1 py-2 rounded-md ${
                authMode === 'login' ? 'bg-white text-[#172B4D] shadow-sm' : 'text-slate-600'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setAuthError(null);
              }}
              className={`flex-1 py-2 rounded-md ${
                authMode === 'register' ? 'bg-white text-[#172B4D] shadow-sm' : 'text-slate-600'
              }`}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'register' && (
              <>
                <div>
                  <label htmlFor="acc-name" className="block text-xs font-semibold text-[#172B4D] mb-1">
                    Nom complet
                  </label>
                  <input
                    id="acc-name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="acc-phone" className="block text-xs font-semibold text-[#172B4D] mb-1">
                    Téléphone
                  </label>
                  <input
                    id="acc-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="acc-email" className="block text-xs font-semibold text-[#172B4D] mb-1">
                Adresse e-mail
              </label>
              <input
                id="acc-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
              />
            </div>

            {authMode !== 'recover' && (
              <div>
                <label htmlFor="acc-pass" className="block text-xs font-semibold text-[#172B4D] mb-1">
                  Mot de passe
                </label>
                <input
                  id="acc-pass"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
                />
              </div>
            )}

            {authError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-lg">
                {authError}
              </p>
            )}
            {authMessage && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg">
                {authMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-[#172B4D] text-white text-sm font-semibold rounded-lg hover:opacity-95"
            >
              {submitting
                ? 'Traitement...'
                : authMode === 'login'
                  ? 'Se connecter'
                  : authMode === 'register'
                    ? 'Créer mon compte'
                    : 'Envoyer le lien'}
            </button>
          </form>

          {authMode === 'login' && (
            <button
              type="button"
              onClick={() => setAuthMode('recover')}
              className="text-xs text-slate-600 hover:text-[#172B4D] underline block"
            >
              Mot de passe oublié ?
            </button>
          )}

          <div className="pt-4 border-t border-slate-200 space-y-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={submitting}
              className="w-full py-2.5 border border-slate-300 bg-white text-[#172B4D] text-sm font-semibold rounded-lg hover:bg-[#F5F7FA]"
            >
              Continuer avec Google
            </button>

            <div className="bg-[#F5F7FA] rounded-lg p-3 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-[#172B4D]">Compte client de démonstration</p>
              <p>E-mail : client.demo@librairie-amine.ma · Mot de passe : ClientDemo2026!</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#172B4D]">
            Bonjour, {user.fullName}
          </h1>
          <p className="text-sm text-slate-600">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          {user.role === 'admin' && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-4 py-2 bg-[#F59E0B] text-white text-xs font-semibold rounded-lg"
            >
              Tableau de bord Admin
            </button>
          )}
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-[#172B4D] hover:bg-[#F5F7FA]"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-3 space-y-1">
          {[
            { id: 'profile', label: 'Mon profil & sécurité', icon: User },
            { id: 'orders', label: 'Historique des commandes', icon: Package },
            { id: 'addresses', label: 'Mes adresses', icon: MapPin },
            { id: 'wishlist', label: 'Ma liste de souhaits', icon: Heart },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#172B4D] text-white'
                    : 'text-[#252B36] hover:bg-[#F5F7FA]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        <div className="lg:col-span-9">
          {loadingAccount && !accountData ? (
            <div className="h-64 bg-[#F5F7FA] rounded-2xl animate-pulse" />
          ) : activeTab === 'orders' ? (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#172B4D]">
                Mes commandes ({accountData?.orders?.length || 0})
              </h2>
              {!accountData?.orders?.length ? (
                <div className="bg-[#F5F7FA] border border-slate-200 rounded-xl p-8 text-center">
                  <p className="text-sm text-slate-600">Vous n’avez pas encore passé de commande.</p>
                </div>
              ) : (
                accountData.orders.map((o) => (
                  <div
                    key={o.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <span className="font-mono-num font-bold text-[#172B4D]">
                          {o.orderNumber}
                        </span>
                        <span className="text-xs text-slate-500 ml-3">
                          {formatDateFR(o.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-semibold">
                        <span className="text-[#172B4D]">
                          Statut : {ORDER_STATUS_LABELS[o.status as OrderStatus] || o.status}
                        </span>
                        <span className="font-mono-num text-sm text-[#172B4D]">
                          {formatMAD(o.totalAmount)}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      {o.items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between">
                          <span>
                            {item.productName} × {item.quantity}
                          </span>
                          <span className="font-mono-num">{formatMAD(item.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/suivi?orderNumber=${o.orderNumber}`)}
                      className="text-xs font-semibold text-[#F59E0B] hover:underline"
                    >
                      Suivre l’expédition →
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'addresses' ? (
            <div className="space-y-6">
              <h2 className="font-display text-xl font-bold text-[#172B4D]">
                Adresses enregistrées
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {accountData?.addresses?.map((addr) => (
                  <div
                    key={addr.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-start"
                  >
                    <div className="text-sm space-y-0.5">
                      <p className="font-bold text-[#172B4D]">{addr.label}</p>
                      <p>{addr.fullName}</p>
                      <p className="text-slate-600">{addr.addressLine}</p>
                      <p className="text-slate-600">{addr.city}</p>
                      <p className="text-xs text-slate-500">{addr.phone}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(addr.id)}
                      aria-label={`Supprimer l'adresse ${addr.label}`}
                      className="p-1.5 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleAddAddress}
                className="bg-[#F5F7FA] border border-slate-200 rounded-xl p-5 space-y-4"
              >
                <h3 className="font-display text-sm font-bold text-[#172B4D] flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>Ajouter une adresse</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    placeholder="Libellé (Domicile, Bureau...)"
                    value={addrLabel}
                    onChange={(e) => setAddrLabel(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Ville"
                    required
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Nom du destinataire"
                    value={addrName}
                    onChange={(e) => setAddrName(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Téléphone"
                    value={addrPhone}
                    onChange={(e) => setAddrPhone(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Adresse complète"
                    required
                    value={addrLine}
                    onChange={(e) => setAddrLine(e.target.value)}
                    className="sm:col-span-2 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#172B4D] text-white text-xs font-semibold rounded-lg"
                >
                  Enregistrer l’adresse
                </button>
              </form>
            </div>
          ) : activeTab === 'wishlist' ? (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#172B4D]">
                Ma liste de souhaits
              </h2>
              {!accountData?.wishlist?.length ? (
                <p className="text-sm text-slate-600">Votre liste de souhaits est vide.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {accountData.wishlist.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4 items-center"
                    >
                      <SafeImage
                        src={p.primaryImage}
                        alt={p.name}
                        className="w-16 h-16 rounded-lg object-cover bg-[#F5F7FA]"
                      />
                      <div className="flex-1 min-w-0">
                        <a
                          href={`/produit/${p.slug}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/produit/${p.slug}`);
                          }}
                          className="font-semibold text-sm text-[#172B4D] hover:underline line-clamp-1"
                        >
                          {p.name}
                        </a>
                        <p className="font-mono-num text-xs font-bold text-[#172B4D] mt-0.5">
                          {formatMAD(p.promoPrice || p.price)}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => addToCart({ ...p, effectivePrice: parseFloat(p.promoPrice || p.price), priceNum: parseFloat(p.price) }, 1)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#172B4D] hover:text-[#F59E0B]"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Ajouter</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              toggleWishlist(p.id).then(() => fetchAccount(token));
                            }}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Retirer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <form
                onSubmit={handleSaveProfile}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <h2 className="font-display text-lg font-bold text-[#172B4D]">
                  Informations personnelles
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                      Nom complet
                    </label>
                    <input
                      value={profName}
                      onChange={(e) => setProfName(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                      Téléphone
                    </label>
                    <input
                      value={profPhone}
                      onChange={(e) => setProfPhone(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                      Ville par défaut
                    </label>
                    <input
                      value={profCity}
                      onChange={(e) => setProfCity(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
                >
                  Enregistrer les modifications
                </button>
              </form>

              <form
                onSubmit={handleChangePassword}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <h2 className="font-display text-lg font-bold text-[#172B4D]">
                  Changer le mot de passe
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="password"
                    placeholder="Mot de passe actuel"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="password"
                    placeholder="Nouveau mot de passe (min. 6 caractères)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 border border-slate-300 text-[#172B4D] text-sm font-semibold rounded-lg hover:bg-[#F5F7FA]"
                >
                  Mettre à jour le mot de passe
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
