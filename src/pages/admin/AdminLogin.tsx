import React, { useState } from 'react';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../../lib/firebase';
import { useStore } from '../../context/StoreContext';

export function AdminLogin() {
  const { setSession, navigate, showToast } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Identifiants invalides.');
      if (data.user?.role !== 'admin') {
        throw new Error('Accès refusé : ce compte ne dispose pas des droits administrateur.');
      }
      setSession(data.token, data.user);
      showToast('Connexion administrateur réussie.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAdmin = async () => {
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Connexion Google refusée.');
      if (data.user?.role !== 'admin') {
        throw new Error('Ce compte Google n’est pas autorisé à accéder à l’administration.');
      }
      setSession(data.token, data.user);
      showToast('Connexion administrateur réussie.');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la connexion Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#252B36]/70 hover:text-[#172B4D]"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la boutique
          </button>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#172B4D]">
            <ShieldCheck className="w-4 h-4 text-[#F59E0B]" />
            Espace gérant
          </span>
        </div>

        <h1 className="font-display text-2xl font-bold text-[#172B4D]">
          Administration — Librairie Amine
        </h1>
        <p className="text-sm text-[#252B36]/70 mt-1">
          Connectez-vous pour gérer le catalogue, les stocks, les commandes et les paramètres de la boutique.
        </p>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label htmlFor="admin-email" className="block text-sm font-medium text-[#172B4D] mb-1">
              Adresse e-mail administrateur
            </label>
            <input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@librairie-amine.ma"
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-[#252B36] focus:outline-none focus:ring-2 focus:ring-[#172B4D]"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-[#172B4D] mb-1">
              Mot de passe
            </label>
            <input
              id="admin-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-[#252B36] focus:outline-none focus:ring-2 focus:ring-[#172B4D]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#172B4D] text-white text-sm font-semibold rounded-lg hover:opacity-95 disabled:opacity-60"
          >
            <Lock className="w-4 h-4 text-[#F59E0B]" />
            {loading ? 'Connexion en cours...' : 'Se connecter au tableau de bord'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
          <div className="flex-1 h-px bg-slate-200" />
          <span>ou</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleAdmin}
          disabled={loading}
          className="w-full py-2.5 px-4 border border-slate-300 rounded-lg text-sm font-medium text-[#252B36] hover:bg-[#F5F7FA] transition-colors"
        >
          Continuer avec Google
        </button>

        <div className="mt-6 bg-[#F5F7FA] border border-slate-200 rounded-xl p-3.5 text-xs text-[#252B36]/80 space-y-1">
          <p className="font-semibold text-[#172B4D]">Accès de démonstration initial</p>
          <p>
            E-mail : <span className="font-mono-num">admin@librairie-amine.ma</span> · Mot de passe :{' '}
            <span className="font-mono-num">AmineAdmin2026!</span>
          </p>
          <p className="text-[11px] text-[#252B36]/60">
            Pensez à modifier ce mot de passe dans Paramètres → Sécurité avant la mise en ligne.
          </p>
          <button
            type="button"
            onClick={() => {
              setEmail('admin@librairie-amine.ma');
              setPassword('AmineAdmin2026!');
            }}
            className="text-[#172B4D] font-semibold underline mt-1"
          >
            Préremplir les identifiants de démonstration
          </button>
        </div>
      </div>
    </div>
  );
}
