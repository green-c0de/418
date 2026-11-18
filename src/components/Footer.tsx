import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function Footer() {
  const { settings, categories, navigate } = useStore();
  const general = settings?.general;

  return (
    <footer className="bg-[#172B4D] text-white mt-16 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Col 1: Brand & Description */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            {general?.logoUrl && (
              <img
                src={general.logoUrl}
                alt={general.storeName || 'Librairie Amine'}
                referrerPolicy="no-referrer"
                className="h-8 w-auto object-contain bg-white rounded p-1"
              />
            )}
            <span className="font-display text-xl font-bold tracking-tight text-white">
              {general?.storeName || 'Librairie Amine'}
            </span>
          </div>
          <p className="text-sm text-white/75 leading-relaxed">
            {general?.description ||
              'Librairie, papeterie et fournitures scolaires et de bureau à Aït Melloul, Maroc.'}
          </p>
          <div className="flex items-center gap-4 pt-2 text-xs text-white/75">
            {general?.socialFacebook && (
              <a
                href={general.socialFacebook}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#F59E0B] underline"
              >
                Facebook
              </a>
            )}
            {general?.socialInstagram && (
              <a
                href={general.socialInstagram}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#F59E0B] underline"
              >
                Instagram
              </a>
            )}
          </div>
        </div>

        {/* Col 2: Navigation & Categories */}
        <div className="space-y-3">
          <h3 className="font-display text-sm font-semibold text-[#F59E0B]">
            Boutique &amp; Rayons
          </h3>
          <ul className="space-y-2 text-sm text-white/80">
            <li>
              <a
                href="/boutique"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/boutique');
                }}
                className="hover:text-white transition-colors"
              >
                Tous nos produits
              </a>
            </li>
            {categories.slice(0, 5).map((cat) => (
              <li key={cat.id}>
                <a
                  href={`/boutique?category=${cat.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/boutique?category=${encodeURIComponent(cat.slug)}`);
                  }}
                  className="hover:text-white transition-colors"
                >
                  {cat.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3: Service client & Informations légales */}
        <div className="space-y-3">
          <h3 className="font-display text-sm font-semibold text-[#F59E0B]">
            Service client &amp; Informations
          </h3>
          <ul className="space-y-2 text-sm text-white/80">
            <li>
              <a
                href="/suivi"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/suivi');
                }}
                className="hover:text-white transition-colors"
              >
                Suivre ma commande
              </a>
            </li>
            <li>
              <a
                href="/compte"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/compte');
                }}
                className="hover:text-white transition-colors"
              >
                Mon compte client
              </a>
            </li>
            <li>
              <a
                href="/cgv"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/cgv');
                }}
                className="hover:text-white transition-colors"
              >
                Conditions générales de vente
              </a>
            </li>
            <li>
              <a
                href="/confidentialite"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/confidentialite');
                }}
                className="hover:text-white transition-colors"
              >
                Politique de confidentialité
              </a>
            </li>
            <li>
              <a
                href="/livraison"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/livraison');
                }}
                className="hover:text-white transition-colors"
              >
                Politique de livraison
              </a>
            </li>
            <li>
              <a
                href="/retour"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/retour');
                }}
                className="hover:text-white transition-colors"
              >
                Politique de retour
              </a>
            </li>
          </ul>
        </div>

        {/* Col 4: Coordonnées */}
        <div className="space-y-3">
          <h3 className="font-display text-sm font-semibold text-[#F59E0B]">
            Coordonnées &amp; Horaires
          </h3>
          <ul className="space-y-2.5 text-sm text-white/80">
            <li className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
              <span>{general?.address || 'Aït Melloul, Maroc'}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-[#F59E0B] shrink-0" />
              <span>{general?.phone || 'À configurer'}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-[#F59E0B] shrink-0" />
              <span>{general?.email || 'contact@librairie-amine.ma'}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
              <span>{general?.openingHours || 'Lundi – Samedi'}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/70">
          <p>
            © {new Date().getFullYear()} {general?.storeName || 'Librairie Amine'} — Aït Melloul,
            Maroc. Tous droits réservés.
          </p>
          <div className="flex items-center gap-5">
            <a
              href="/a-propos"
              onClick={(e) => {
                e.preventDefault();
                navigate('/a-propos');
              }}
              className="hover:text-white"
            >
              À propos
            </a>
            <a
              href="/contact"
              onClick={(e) => {
                e.preventDefault();
                navigate('/contact');
              }}
              className="hover:text-white"
            >
              Contact
            </a>
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                navigate('/admin');
              }}
              className="hover:text-[#F59E0B] font-medium"
            >
              Espace administrateur
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
