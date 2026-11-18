import React, { useState } from 'react';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SafeImage } from '../components/SafeImage';
import { StoreMap } from '../components/StoreMap';

export function AboutPage() {
  const { settings, navigate } = useStore();
  const about = settings?.about;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-center space-y-5">
          <p className="text-xs font-semibold text-[#F59E0B]">
            À propos · Contenu modifiable dans l’administration
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#172B4D]">
            {settings?.general?.storeName || 'Librairie Amine'} à Aït Melloul
          </h1>
          <p className="text-base text-[#252B36] leading-relaxed">{about?.intro}</p>
          <div>
            <button
              type="button"
              onClick={() => navigate('/boutique')}
              className="px-6 py-3 bg-[#172B4D] text-white text-sm font-semibold rounded-lg"
            >
              Découvrir le catalogue
            </button>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="rounded-2xl overflow-hidden border border-slate-200 h-full min-h-[280px]">
            <SafeImage
              src={
                about?.image ||
                '/src/assets/images/about_librairie_interior_1795013247640.jpg'
              }
              alt="Intérieur de la Librairie Amine"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { title: 'Notre histoire', text: about?.history },
          { title: 'Notre mission', text: about?.mission },
          { title: 'Nos valeurs', text: about?.values },
          { title: 'Notre engagement envers les clients', text: about?.commitment },
        ].map((block) => (
          <div
            key={block.title}
            className="bg-[#F5F7FA] border border-slate-200 rounded-2xl p-6 space-y-2"
          >
            <h2 className="font-display text-lg font-bold text-[#172B4D]">
              {block.title}
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">{block.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContactPage() {
  const { settings, googleMapsApiKey, showToast } = useStore();
  const general = settings?.general;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSentMessage(null);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur envoi');
      setSentMessage(data.message);
      setName('');
      setPhone('');
      setEmail('');
      setSubject('');
      setMessage('');
      showToast('Message envoyé.');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSending(false);
    }
  };

  const whatsappDigits = (general?.whatsapp || '').replace(/\D/g, '');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="max-w-2xl space-y-2">
        <p className="text-xs font-semibold text-[#F59E0B]">Contact &amp; Localisation</p>
        <h1 className="font-display text-3xl font-bold text-[#172B4D]">
          Contactez {general?.storeName || 'Librairie Amine'}
        </h1>
        <p className="text-sm text-slate-600">
          Une question sur une liste scolaire, une commande entreprise ou la disponibilité d’un livre ? Écrivez-nous.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#F5F7FA] border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500">Adresse</p>
                <p className="text-sm font-medium text-[#172B4D]">{general?.address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500">Téléphone</p>
                <p className="text-sm font-medium text-[#172B4D]">{general?.phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500">E-mail</p>
                <p className="text-sm font-medium text-[#172B4D]">{general?.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500">Horaires d’ouverture</p>
                <p className="text-sm font-medium text-[#172B4D]">{general?.openingHours}</p>
              </div>
            </div>

            {whatsappDigits ? (
              <a
                href={`https://wa.me/${whatsappDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Contacter sur WhatsApp</span>
              </a>
            ) : (
              <p className="text-xs text-slate-500 pt-2 border-t border-slate-200">
                Numéro WhatsApp configurable dans Paramètres &gt; Général.
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4"
          >
            <h2 className="font-display text-xl font-bold text-[#172B4D]">
              Envoyer un message
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cnt-name" className="block text-xs font-semibold text-[#172B4D] mb-1">
                  Nom complet *
                </label>
                <input
                  id="cnt-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label htmlFor="cnt-phone" className="block text-xs font-semibold text-[#172B4D] mb-1">
                  Téléphone *
                </label>
                <input
                  id="cnt-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cnt-email" className="block text-xs font-semibold text-[#172B4D] mb-1">
                  E-mail
                </label>
                <input
                  id="cnt-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label htmlFor="cnt-subject" className="block text-xs font-semibold text-[#172B4D] mb-1">
                  Objet *
                </label>
                <input
                  id="cnt-subject"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>
            <div>
              <label htmlFor="cnt-msg" className="block text-xs font-semibold text-[#172B4D] mb-1">
                Message *
              </label>
              <textarea
                id="cnt-msg"
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
              />
            </div>

            {sentMessage && (
              <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                {sentMessage}
              </p>
            )}
            {errorMsg && (
              <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="px-6 py-3 bg-[#172B4D] text-white text-sm font-semibold rounded-lg hover:opacity-95"
            >
              {sending ? 'Envoi en cours...' : 'Envoyer le message'}
            </button>
          </form>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-xl font-bold text-[#172B4D]">
          Localisation à Aït Melloul
        </h2>
        <StoreMap
          apiKey={googleMapsApiKey}
          lat={Number(general?.mapsLat || 30.3342)}
          lng={Number(general?.mapsLng || -9.4972)}
          storeName={general?.storeName || 'Librairie Amine'}
          address={general?.address || 'Aït Melloul, Maroc'}
        />
      </div>
    </div>
  );
}

export function LegalPage({ type }: { type: 'cgv' | 'confidentialite' | 'livraison' | 'retour' }) {
  const { settings } = useStore();
  const storeName = settings?.general?.storeName || 'Librairie Amine';

  const contentMap = {
    cgv: {
      title: 'Conditions générales de vente',
      sections: [
        `Les présentes conditions régissent les ventes effectuées sur la boutique en ligne de ${storeName} (Aït Melloul, Maroc).`,
        'Tous les prix sont affichés en dirhams marocains (DH). Les articles affichés avec la mention « Donnée de démonstration » doivent être validés et remplacés par le propriétaire avant mise en production.',
        'La confirmation d’une commande vaut acceptation des prix, quantités et modalités de livraison sélectionnées.',
      ],
    },
    confidentialite: {
      title: 'Politique de confidentialité',
      sections: [
        `${storeName} collecte uniquement les informations nécessaires au traitement des commandes, à la livraison et à la gestion des comptes clients.`,
        'Vos données personnelles (nom, téléphone, adresse, e-mail) ne sont jamais revendues à des tiers. Ce site intègre Google Maps pour afficher la localisation du magasin, soumis aux conditions de Google Maps Platform.',
      ],
    },
    livraison: {
      title: 'Politique de livraison',
      sections: [
        `Le retrait en magasin à ${storeName} (Aït Melloul) est disponible gratuitement selon les horaires d’ouverture configurés.`,
        'Les tarifs et délais de livraison pour Aït Melloul, le Grand Agadir et les autres villes du Maroc sont définis par l’administrateur dans la section Livraisons et affichés lors du passage de commande.',
      ],
    },
    retour: {
      title: 'Politique de retour',
      sections: [
        'Tout article non utilisé, dans son emballage d’origine intact et accompagné du bon de commande ou de la facture, peut faire l’objet d’une demande d’échange ou de retour selon les modalités convenues avec la librairie.',
        'Pour toute demande, contactez notre service client via la page Contact en précisant votre numéro de commande.',
      ],
    },
  };

  const current = contentMap[type];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#172B4D]">{current.title}</h1>
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4">
        {current.sections.map((paragraph, idx) => (
          <p key={idx} className="text-sm sm:text-base text-slate-700 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
