import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  adminActivityLogs,
  adminUsers,
  brands,
  categories,
  coupons,
  customerProfiles,
  deliveries,
  deliveryZones,
  inventoryMovements,
  notifications,
  orderItems,
  orders,
  payments,
  productImages,
  products,
  reviews,
  storeSettings,
  suppliers,
  users,
} from '../db/schema.ts';
import { hashPassword } from './auth.ts';

let seedPromise: Promise<void> | null = null;
let seededDone = false;

export const DEFAULT_STORE_SETTINGS: Record<string, Record<string, unknown>> = {
  general: {
    storeName: 'Librairie Amine',
    tagline: 'Librairie, Papeterie & Fournitures Scolaires et de Bureau',
    description:
      'Boutique de proximité à Aït Melloul proposant fournitures scolaires, articles de bureau, livres et matériel créatif (texte de présentation modifiable dans l’administration).',
    address: 'Aït Melloul, Préfecture d’Inezgane-Aït Melloul, Maroc (Adresse exacte à compléter)',
    city: 'Aït Melloul',
    phone: '+212 5XX-XX-XX-XX (À configurer)',
    whatsapp: '',
    email: 'contact@librairie-amine.ma',
    openingHours: 'Lundi – Samedi : horaires à configurer dans les paramètres',
    socialFacebook: '',
    socialInstagram: '',
    mapsLat: 30.3342,
    mapsLng: -9.4972,
    logoUrl: '',
  },
  branding: {
    primaryColor: '#172B4D',
    secondaryColor: '#F59E0B',
    fontFamily: 'Plus Jakarta Sans',
  },
  currency: {
    code: 'MAD',
    symbol: 'DH',
    decimals: 2,
  },
  delivery: {
    freeDeliveryThreshold: null,
    storePickupEnabled: true,
    storePickupLabel: 'Retrait en magasin — Librairie Amine, Aït Melloul (Gratuit)',
    defaultDelayNote: 'Les frais et délais par ville sont configurables dans l’administration.',
  },
  payment: {
    codEnabled: true,
    codLabel: 'Paiement à la livraison',
    codInstructions:
      'Réglez le montant exact en dirhams (DH) lors de la réception de votre commande.',
    onlineEnabled: false,
    onlineProvider: 'Passerelle marocaine agréée (CMI / Payzone)',
    onlineMerchantId: '',
    onlineInstructions:
      'Le paiement en ligne sera disponible dès que les identifiants marchands auront été configurés.',
    bankTransferEnabled: true,
    bankTransferLabel: 'Virement bancaire',
    bankTransferInstructions:
      'RIB et intitulé du compte à renseigner dans Paramètres > Paiements.',
  },
  tax: {
    enabled: false,
    ratePercent: 0,
    label: 'TVA (à configurer selon le régime fiscal de la boutique)',
  },
  notifications: {
    newOrderEmail: true,
    orderConfirmed: true,
    orderShipped: true,
    orderDelivered: true,
    newCustomer: true,
    lowStock: true,
    outOfStock: true,
    whatsappEnabled: false,
  },
  homepage: {
    announcementEnabled: true,
    announcementText:
      'Librairie Amine à Aït Melloul — Données de démonstration modifiables depuis votre tableau de bord.',
    heroHeadline: 'Tout ce dont vous avez besoin, au même endroit !',
    heroSubtitle:
      'Découvrez notre sélection de fournitures scolaires, articles de bureau, livres et accessoires.',
    heroImage: '/src/assets/images/hero_librairie_stationery_1795013246365.jpg',
    promoBannerTitle: 'Offres & Sélections de démonstration',
    promoBannerSubtitle:
      'Tarifs et remises d’exemple entièrement personnalisables depuis l’espace administrateur.',
    visibleSections: {
      categories: true,
      best_sellers: true,
      new_arrivals: true,
      special_offers: true,
      why_us: true,
      reviews: true,
      newsletter: true,
    },
    sectionsOrder: [
      'categories',
      'best_sellers',
      'new_arrivals',
      'special_offers',
      'why_us',
      'reviews',
      'newsletter',
    ],
  },
  seo: {
    siteTitle: 'Librairie Amine — Librairie, Papeterie & Fournitures à Aït Melloul',
    metaDescription:
      'Boutique en ligne de la Librairie Amine à Aït Melloul, Maroc. Fournitures scolaires, articles de bureau, livres et accessoires.',
    ogImage: '/src/assets/images/hero_librairie_stationery_1795013246365.jpg',
  },
  about: {
    intro:
      'Texte de présentation modifiable : présentez l’histoire réelle de la Librairie Amine à Aït Melloul depuis votre espace d’administration.',
    history:
      'Cette section est destinée à accueillir le parcours et les repères historiques réels de votre librairie à Aït Melloul.',
    mission:
      'Accompagner les élèves, étudiants, enseignants, professionnels et familles d’Aït Melloul avec un accès simple aux fournitures et ouvrages essentiels.',
    values:
      'Qualité de conseil, accueil de proximité, transparence des prix et disponibilité des articles tout au long de l’année.',
    commitment:
      'Un suivi clair de chaque commande, du retrait en magasin à la livraison vers les villes configurées.',
    image: '/src/assets/images/about_librairie_interior_1795013247640.jpg',
  },
};

async function runSeed() {
  try {
    const existingSettings = await db.select().from(storeSettings).limit(1);
    if (existingSettings.length > 0) {
      seededDone = true;
      return;
    }

    // 1. Store settings
    for (const [key, value] of Object.entries(DEFAULT_STORE_SETTINGS)) {
      await db
        .insert(storeSettings)
        .values({ key, value })
        .onConflictDoNothing();
    }

    // 2. Admin & Sample Customer Users
    const adminPassHash = await hashPassword('AmineAdmin2026!');
    const customerPassHash = await hashPassword('ClientDemo2026!');

    const [adminUser] = await db
      .insert(users)
      .values({
        uid: 'local-admin-librairie-amine',
        email: 'admin@librairie-amine.ma',
        passwordHash: adminPassHash,
        fullName: 'Administrateur Librairie Amine',
        phone: '+212 5XX-XX-XX-XX',
        role: 'admin',
      })
      .onConflictDoNothing()
      .returning();

    if (adminUser) {
      await db
        .insert(adminUsers)
        .values({
          userId: adminUser.id,
          roleLabel: 'Propriétaire / Administrateur',
          permissions: ['all'],
        })
        .onConflictDoNothing();
    }

    const [demoCustomer] = await db
      .insert(users)
      .values({
        uid: 'local-client-demo',
        email: 'client.demo@librairie-amine.ma',
        passwordHash: customerPassHash,
        fullName: 'Client Démonstration',
        phone: '0600000000',
        role: 'customer',
      })
      .onConflictDoNothing()
      .returning();

    if (demoCustomer) {
      await db
        .insert(customerProfiles)
        .values({
          userId: demoCustomer.id,
          defaultCity: 'Aït Melloul',
          totalSpent: '145.00',
          ordersCount: 1,
        })
        .onConflictDoNothing();
    }

    // 3. Categories (10 categories matching specification)
    const categorySeeds = [
      {
        name: 'Fournitures scolaires',
        slug: 'fournitures-scolaires',
        description: 'Cartables, trousses, géométrie et essentiels de la rentrée.',
        imageUrl: '/src/assets/images/cat_scolaire_supplies_1795013246837.jpg',
        displayOrder: 1,
      },
      {
        name: 'Fournitures de bureau',
        slug: 'fournitures-de-bureau',
        description: 'Classement, organiseurs, agrafeuses et équipements de bureau.',
        imageUrl: '/src/assets/images/cat_bureau_supplies_1795013247260.jpg',
        displayOrder: 2,
      },
      {
        name: 'Cahiers et blocs-notes',
        slug: 'cahiers-et-blocs-notes',
        description: 'Cahiers grands et petits formats, carnets à spirales et blocs-notes.',
        imageUrl: '/src/assets/images/prod_cahier_oxford_1795013248428.jpg',
        displayOrder: 3,
      },
      {
        name: "Stylos et instruments d'écriture",
        slug: 'stylos-et-instruments-ecriture',
        description: 'Stylos bille, gel, plume, marqueurs et surligneurs.',
        imageUrl: '/src/assets/images/prod_stylo_plume_1795013250205.jpg',
        displayOrder: 4,
      },
      {
        name: 'Livres',
        slug: 'livres',
        description: 'Manuels scolaires, littérature francophone, ouvrages parascolaires.',
        imageUrl: '/src/assets/images/cat_livres_edition_1795013247957.jpg',
        displayOrder: 5,
      },
      {
        name: 'Matériel de dessin et loisirs créatifs',
        slug: 'materiel-de-dessin-et-loisirs-creatifs',
        description: 'Aquarelles, pinceaux, carnets à croquis et crayons de couleur.',
        imageUrl: '/src/assets/images/cat_dessin_creatif_1795013249915.jpg',
        displayOrder: 6,
      },
      {
        name: 'Papier et impression',
        slug: 'papier-et-impression',
        description: 'Ramettes A4 80g, papier bristol, enveloppes et fiches bristol.',
        imageUrl: '/src/assets/images/prod_ramette_papier_1795013252880.jpg',
        displayOrder: 7,
      },
      {
        name: 'Matériel pédagogique',
        slug: 'materiel-pedagogique',
        description: 'Calculatrices scientifiques, tableaux, ardoises et kits éducatifs.',
        imageUrl: '/src/assets/images/prod_calculatrice_pro_1795013250786.jpg',
        displayOrder: 8,
      },
      {
        name: 'Accessoires',
        slug: 'accessoires',
        description: 'Sacs à dos ergonomiques, trousses et accessoires du quotidien.',
        imageUrl: '/src/assets/images/prod_sac_ergonomique_1795013249732.jpg',
        displayOrder: 9,
      },
      {
        name: 'Promotions',
        slug: 'promotions',
        description: 'Sélection d’articles bénéficiant d’une remise temporaire.',
        imageUrl: '/src/assets/images/prod_coffret_peinture_1795013251598.jpg',
        displayOrder: 10,
      },
    ];

    const insertedCats = await db
      .insert(categories)
      .values(categorySeeds)
      .onConflictDoNothing()
      .returning();

    const catBySlug = Object.fromEntries(insertedCats.map((c) => [c.slug, c]));

    // 4. Brands
    const brandSeeds = [
      { name: 'Oxford', slug: 'oxford', description: 'Cahiers et papeterie scolaire (exemple).' },
      { name: 'Pilot', slug: 'pilot', description: 'Instruments d’écriture de précision (exemple).' },
      { name: 'Faber-Castell', slug: 'faber-castell', description: 'Dessin et beaux-arts (exemple).' },
      { name: 'Casio', slug: 'casio', description: 'Calculatrices scolaires et scientifiques (exemple).' },
      { name: 'Clairefontaine', slug: 'clairefontaine', description: 'Papiers et cahiers de qualité (exemple).' },
      { name: 'Sélection Librairie', slug: 'selection-librairie', description: 'Sélection générale (exemple).' },
    ];
    const insertedBrands = await db
      .insert(brands)
      .values(brandSeeds)
      .onConflictDoNothing()
      .returning();
    const brandBySlug = Object.fromEntries(insertedBrands.map((b) => [b.slug, b]));

    // 5. Suppliers
    const [supplier1] = await db
      .insert(suppliers)
      .values([
        {
          name: 'Fournisseur Papeterie Souss (Exemple)',
          contactName: 'Service Commandes',
          phone: '+212 5XX-XX-XX-XX',
          email: 'commandes@fournisseur-exemple.ma',
          city: 'Agadir',
          address: 'Zone Industrielle (Donnée exemple)',
        },
        {
          name: 'Distributeur Éditions & Livres (Exemple)',
          contactName: 'Bureau Commercial',
          phone: '+212 5XX-XX-XX-XX',
          email: 'editions@distributeur-exemple.ma',
          city: 'Casablanca',
          address: 'Centre logistique (Donnée exemple)',
        },
      ])
      .returning();

    // 6. Demo Products (all marked isSample: true)
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const productSeeds: Array<{
      name: string;
      slug: string;
      sku: string;
      barcode: string;
      categoryId: number | null;
      brandId: number | null;
      shortDescription: string;
      description: string;
      specifications: Record<string, string>;
      price: string;
      promoPrice: string | null;
      costPrice: string;
      stockQuantity: number;
      alertThreshold: number;
      weightGrams: number;
      status: string;
      isFeatured: boolean;
      isBestSeller: boolean;
      isSample: boolean;
      promoExpiresAt: Date | null;
      salesCount: number;
      image: string;
    }> = [
      {
        name: 'Cahier Spirale Couverture Rigide A4 — 200 Pages',
        slug: 'cahier-spirale-a4-200p-exemple',
        sku: 'DEMO-CAH-001',
        barcode: '6110000000011',
        categoryId: catBySlug['cahiers-et-blocs-notes']?.id ?? null,
        brandId: brandBySlug['oxford']?.id ?? null,
        shortDescription: 'Exemple de démonstration : papier 90g grands carreaux, reliure spirale double.',
        description:
          'Produit de démonstration modifiable dans l’administration. Cahier A4 grand format idéal pour le lycée, l’université et le bureau avec signet élastique et papier haute opacité.',
        specifications: {
          Format: 'A4 (21 × 29,7 cm)',
          Grammage: '90 g/m²',
          Pages: '200 pages quadrillées',
          Reliure: 'Spirale métallique double',
        },
        price: '35.00',
        promoPrice: '28.00',
        costPrice: '20.00',
        stockQuantity: 48,
        alertThreshold: 8,
        weightGrams: 420,
        status: 'active',
        isFeatured: true,
        isBestSeller: true,
        isSample: true,
        promoExpiresAt: nextMonth,
        salesCount: 34,
        image: '/src/assets/images/prod_cahier_oxford_1795013248428.jpg',
      },
      {
        name: 'Coffret Duo Stylo Plume & Roller Finition Laiton',
        slug: 'coffret-stylo-plume-roller-exemple',
        sku: 'DEMO-STY-002',
        barcode: '6110000000028',
        categoryId: catBySlug['stylos-et-instruments-ecriture']?.id ?? null,
        brandId: brandBySlug['pilot']?.id ?? null,
        shortDescription: 'Exemple de démonstration : écriture fluide, corps métal bleu marine et laiton.',
        description:
          'Article de démonstration. Duo élégant comprenant un stylo plume pointe moyenne et un stylo roller à encre gel rechargeable pour un confort d’écriture quotidien.',
        specifications: {
          Pointe: 'Moyenne (M) / 0,7 mm',
          Encre: 'Noire / Bleue rechargeable',
          Finition: 'Métal mat bleu marine & laiton',
        },
        price: '120.00',
        promoPrice: null,
        costPrice: '75.00',
        stockQuantity: 22,
        alertThreshold: 5,
        weightGrams: 180,
        status: 'active',
        isFeatured: true,
        isBestSeller: true,
        isSample: true,
        promoExpiresAt: null,
        salesCount: 27,
        image: '/src/assets/images/prod_stylo_plume_1795013250205.jpg',
      },
      {
        name: 'Sac à Dos Scolaire Ergonomique Toile Marine',
        slug: 'sac-a-dos-ergonomique-marine-exemple',
        sku: 'DEMO-SAC-003',
        barcode: '6110000000035',
        categoryId: catBySlug['accessoires']?.id ?? null,
        brandId: brandBySlug['selection-librairie']?.id ?? null,
        shortDescription: 'Exemple de démonstration : bretelles rembourrées, compartiment ordinateur 15".',
        description:
          'Produit de démonstration. Sac à dos robuste conçu pour les collégiens, lycéens et étudiants avec dos matelassé, fond renforcé et poches latérales.',
        specifications: {
          Capacité: '24 Litres',
          Matière: 'Toile déperlante haute densité',
          Dimensions: '44 × 30 × 15 cm',
        },
        price: '240.00',
        promoPrice: '195.00',
        costPrice: '135.00',
        stockQuantity: 14,
        alertThreshold: 4,
        weightGrams: 750,
        status: 'active',
        isFeatured: true,
        isBestSeller: true,
        isSample: true,
        promoExpiresAt: nextMonth,
        salesCount: 19,
        image: '/src/assets/images/prod_sac_ergonomique_1795013249732.jpg',
      },
      {
        name: 'Calculatrice Scientifique Lycée & Supérieur',
        slug: 'calculatrice-scientifique-lycee-exemple',
        sku: 'DEMO-CAL-004',
        barcode: '6110000000042',
        categoryId: catBySlug['materiel-pedagogique']?.id ?? null,
        brandId: brandBySlug['casio']?.id ?? null,
        shortDescription: 'Exemple de démonstration : affichage naturel 2 lignes, 250+ fonctions.',
        description:
          'Article de démonstration. Calculatrice adaptée aux programmes de mathématiques et physique du collège au supérieur.',
        specifications: {
          Écran: 'Affichage LCD naturel haute lisibilité',
          Fonctions: '252 fonctions scientifiques',
          Alimentation: 'Pile AAA longue durée',
        },
        price: '165.00',
        promoPrice: null,
        costPrice: '110.00',
        stockQuantity: 4, // Low stock to demonstrate alert in Admin
        alertThreshold: 6,
        weightGrams: 140,
        status: 'active',
        isFeatured: false,
        isBestSeller: true,
        isSample: true,
        promoExpiresAt: null,
        salesCount: 41,
        image: '/src/assets/images/prod_calculatrice_pro_1795013250786.jpg',
      },
      {
        name: 'Coffret Beaux-Arts Aquarelle & Pinceaux Bois',
        slug: 'coffret-aquarelle-pinceaux-exemple',
        sku: 'DEMO-ART-005',
        barcode: '6110000000059',
        categoryId: catBySlug['materiel-de-dessin-et-loisirs-creatifs']?.id ?? null,
        brandId: brandBySlug['faber-castell']?.id ?? null,
        shortDescription: 'Exemple de démonstration : 20 godets aquarelle et 4 pinceaux fins en bois.',
        description:
          'Article de démonstration. Coffret complet présenté en mallette bois pour l’initiation et le perfectionnement en peinture aquarelle.',
        specifications: {
          Contenu: '20 godets + 4 pinceaux + palette céramique',
          Coffret: 'Bois verni avec fermoir laiton',
        },
        price: '290.00',
        promoPrice: '235.00',
        costPrice: '170.00',
        stockQuantity: 9,
        alertThreshold: 3,
        weightGrams: 920,
        status: 'active',
        isFeatured: true,
        isBestSeller: false,
        isSample: true,
        promoExpiresAt: nextMonth,
        salesCount: 12,
        image: '/src/assets/images/prod_coffret_peinture_1795013251598.jpg',
      },
      {
        name: 'Ramette Papier A4 80g/m² — 500 Feuilles + Fiches',
        slug: 'ramette-papier-a4-80g-exemple',
        sku: 'DEMO-PAP-006',
        barcode: '6110000000066',
        categoryId: catBySlug['papier-et-impression']?.id ?? null,
        brandId: brandBySlug['clairefontaine']?.id ?? null,
        shortDescription: 'Exemple de démonstration : papier blanc extra-lisse compatible laser et jet d’encre.',
        description:
          'Article de démonstration. Ramette standard 500 feuilles format A4 80g/m² offrant une blancheur élevée pour l’impression de bureau et scolaire.',
        specifications: {
          Format: 'A4 (210 × 297 mm)',
          Grammage: '80 g/m²',
          Conditionnement: '500 feuilles',
        },
        price: '48.00',
        promoPrice: null,
        costPrice: '34.00',
        stockQuantity: 75,
        alertThreshold: 15,
        weightGrams: 2500,
        status: 'active',
        isFeatured: false,
        isBestSeller: true,
        isSample: true,
        promoExpiresAt: null,
        salesCount: 62,
        image: '/src/assets/images/prod_ramette_papier_1795013252880.jpg',
      },
      {
        name: 'Kit Rentrée Scolaire Essentiel — 12 Pièces',
        slug: 'kit-rentree-scolaire-essentiel-exemple',
        sku: 'DEMO-SCO-007',
        barcode: '6110000000073',
        categoryId: catBySlug['fournitures-scolaires']?.id ?? null,
        brandId: brandBySlug['faber-castell']?.id ?? null,
        shortDescription: 'Exemple de démonstration : trousse toile, crayons de couleur, règles et carnets.',
        description:
          'Pack de démonstration réunissant les indispensables de géométrie, coloriage et prise de notes pour une rentrée sereine.',
        specifications: {
          Inclus: 'Trousse + 18 crayons + kit géométrie + 2 carnets',
          Public: 'Primaire & Collège',
        },
        price: '115.00',
        promoPrice: '92.00',
        costPrice: '65.00',
        stockQuantity: 18,
        alertThreshold: 5,
        weightGrams: 610,
        status: 'active',
        isFeatured: true,
        isBestSeller: false,
        isSample: true,
        promoExpiresAt: nextMonth,
        salesCount: 15,
        image: '/src/assets/images/cat_scolaire_supplies_1795013246837.jpg',
      },
      {
        name: 'Ensemble Organiseur de Bureau & Classeurs Archives',
        slug: 'ensemble-organiseur-bureau-exemple',
        sku: 'DEMO-BUR-008',
        barcode: '6110000000080',
        categoryId: catBySlug['fournitures-de-bureau']?.id ?? null,
        brandId: brandBySlug['selection-librairie']?.id ?? null,
        shortDescription: 'Exemple de démonstration : pot à crayons compartimenté, bloc quadrillé et classeurs.',
        description:
          'Ensemble de bureau de démonstration pensé pour les professionnels, cabinets et administrations.',
        specifications: {
          Contenu: 'Organiseur toile + bloc A4 + 3 classeurs anneaux',
          Couleur: 'Bleu marine & gris ardoise',
        },
        price: '180.00',
        promoPrice: null,
        costPrice: '115.00',
        stockQuantity: 11,
        alertThreshold: 4,
        weightGrams: 1350,
        status: 'active',
        isFeatured: false,
        isBestSeller: false,
        isSample: true,
        promoExpiresAt: null,
        salesCount: 8,
        image: '/src/assets/images/cat_bureau_supplies_1795013247260.jpg',
      },
      {
        name: 'Collection Essais & Littérature Contemporaine (Coffret)',
        slug: 'collection-livres-litterature-exemple',
        sku: 'DEMO-LIV-009',
        barcode: '6110000000097',
        categoryId: catBySlug['livres']?.id ?? null,
        brandId: brandBySlug['selection-librairie']?.id ?? null,
        shortDescription: 'Exemple de démonstration : sélection d’ouvrages reliés de culture générale.',
        description:
          'Notice de démonstration pour la catégorie Livres. Remplacez ce titre par vos références ISBN et ouvrages en rayon.',
        specifications: {
          Langue: 'Français',
          Reliure: 'Couverture rigide / Broché',
          Rayon: 'Littérature & Essais',
        },
        price: '145.00',
        promoPrice: null,
        costPrice: '95.00',
        stockQuantity: 16,
        alertThreshold: 3,
        weightGrams: 890,
        status: 'active',
        isFeatured: true,
        isBestSeller: false,
        isSample: true,
        promoExpiresAt: null,
        salesCount: 11,
        image: '/src/assets/images/cat_livres_edition_1795013247957.jpg',
      },
      {
        name: 'Carnet de Croquis & Palette Aquarelle de Voyage',
        slug: 'carnet-croquis-palette-voyage-exemple',
        sku: 'DEMO-DES-010',
        barcode: '6110000000103',
        categoryId: catBySlug['materiel-de-dessin-et-loisirs-creatifs']?.id ?? null,
        brandId: brandBySlug['faber-castell']?.id ?? null,
        shortDescription: 'Exemple de démonstration : papier 300g sans acide + 24 nuances aquarelle.',
        description:
          'Article de démonstration destiné aux étudiants en architecture, arts appliqués et amateurs d’illustration.',
        specifications: {
          Papier: '300 g/m² grain fin',
          Nuances: '24 godets haute pigmentation',
        },
        price: '155.00',
        promoPrice: '129.00',
        costPrice: '90.00',
        stockQuantity: 0, // Out of stock sample to test Rupture alerts & disabled add to cart
        alertThreshold: 5,
        weightGrams: 540,
        status: 'active',
        isFeatured: false,
        isBestSeller: false,
        isSample: true,
        promoExpiresAt: nextMonth,
        salesCount: 23,
        image: '/src/assets/images/cat_dessin_creatif_1795013249915.jpg',
      },
    ];

    const insertedProducts = [];
    for (const p of productSeeds) {
      const { image, specifications, ...productData } = p;
      const [created] = await db
        .insert(products)
        .values({
          ...productData,
          specifications: specifications as Record<string, string>,
        })
        .onConflictDoNothing()
        .returning();
      if (created) {
        insertedProducts.push(created);
        await db.insert(productImages).values({
          productId: created.id,
          url: image,
          altText: created.name,
          displayOrder: 0,
          isPrimary: true,
        });
        await db.insert(inventoryMovements).values({
          productId: created.id,
          supplierId: supplier1?.id ?? null,
          movementType: 'in',
          quantityDelta: created.stockQuantity,
          previousStock: 0,
          newStock: created.stockQuantity,
          reason: 'Stock initial de démonstration',
          createdBy: 'Système',
        });
      }
    }

    // 7. Delivery Zones (non-invented fees: 0.00 configurable by owner)
    const [pickupZone] = await db
      .insert(deliveryZones)
      .values([
        {
          name: 'Retrait en magasin — Aït Melloul',
          city: 'Aït Melloul',
          fee: '0.00',
          minOrderAmount: '0.00',
          estimatedDelay: 'Prêt sous 2h ouvrées (à confirmer)',
          isStorePickup: true,
          isActive: true,
          isSample: false,
          displayOrder: 1,
        },
        {
          name: 'Livraison locale — Aït Melloul (Tarif à définir)',
          city: 'Aït Melloul',
          fee: '0.00',
          minOrderAmount: '0.00',
          estimatedDelay: '24h (exemple configurable)',
          isStorePickup: false,
          isActive: true,
          isSample: true,
          displayOrder: 2,
        },
        {
          name: 'Livraison — Agadir & Inezgane (Tarif à définir)',
          city: 'Agadir',
          fee: '0.00',
          minOrderAmount: '0.00',
          estimatedDelay: '24h à 48h (exemple configurable)',
          isStorePickup: false,
          isActive: true,
          isSample: true,
          displayOrder: 3,
        },
        {
          name: 'Livraison nationale — Autres villes du Maroc (Tarif à définir)',
          city: 'Autres villes (Maroc)',
          fee: '0.00',
          minOrderAmount: '0.00',
          estimatedDelay: '48h à 72h (exemple configurable)',
          isStorePickup: false,
          isActive: true,
          isSample: true,
          displayOrder: 4,
        },
      ])
      .returning();

    // 8. Coupons
    await db
      .insert(coupons)
      .values([
        {
          code: 'BIENVENUE10',
          discountType: 'percentage',
          discountValue: '10.00',
          minPurchase: '50.00',
          maxUses: 100,
          usedCount: 1,
          expiresAt: nextMonth,
          isActive: true,
          description: 'Code promotionnel de démonstration (-10%)',
        },
        {
          code: 'REMISE20',
          discountType: 'fixed',
          discountValue: '20.00',
          minPurchase: '150.00',
          maxUses: 50,
          usedCount: 0,
          expiresAt: nextMonth,
          isActive: true,
          description: 'Code promotionnel de démonstration (-20 DH dès 150 DH)',
        },
      ])
      .onConflictDoNothing();

    // 9. Sample Store Testimonials & Product Reviews (marked isSample: true)
    await db.insert(reviews).values([
      {
        productId: insertedProducts[0]?.id ?? null,
        authorName: 'Avis Exemple 1',
        authorRole: 'Parent d’élève · Aït Melloul (Donnée de démonstration)',
        rating: 5,
        comment:
          'Témoignage de démonstration : espace réservé aux avis vérifiés de vos clients après mise en service.',
        isApproved: true,
        isStoreTestimonial: true,
        isSample: true,
      },
      {
        productId: insertedProducts[1]?.id ?? null,
        authorName: 'Avis Exemple 2',
        authorRole: 'Entreprise locale · Grand Agadir (Donnée de démonstration)',
        rating: 5,
        comment:
          'Témoignage de démonstration : remplacez ce message par les retours authentiques de vos clients.',
        isApproved: true,
        isStoreTestimonial: true,
        isSample: true,
      },
      {
        productId: insertedProducts[2]?.id ?? null,
        authorName: 'Avis Exemple 3',
        authorRole: 'Étudiant · Aït Melloul (Donnée de démonstration)',
        rating: 5,
        comment:
          'Témoignage de démonstration : modifiable et modérable à tout moment depuis l’onglet Avis clients.',
        isApproved: true,
        isStoreTestimonial: true,
        isSample: true,
      },
    ]);

    // 10. Sample Order for dashboard analytics & order tracking demo
    if (insertedProducts[0] && insertedProducts[1]) {
      const [demoOrder] = await db
        .insert(orders)
        .values({
          orderNumber: 'LA-202611-0001',
          userId: demoCustomer?.id ?? null,
          customerName: 'Client Démonstration',
          customerPhone: '0600000000',
          customerEmail: 'client.demo@librairie-amine.ma',
          city: 'Aït Melloul',
          address: 'Retrait en magasin (Commande exemple)',
          instructions: 'Commande de démonstration initiale',
          deliveryZoneId: pickupZone?.id ?? null,
          deliveryMethod: pickupZone?.name ?? 'Retrait en magasin',
          paymentMethod: 'cod',
          paymentStatus: 'paid',
          status: 'delivered',
          subtotal: '148.00',
          discountAmount: '0.00',
          deliveryFee: '0.00',
          taxAmount: '0.00',
          totalAmount: '148.00',
          stockDeducted: true,
        })
        .onConflictDoNothing()
        .returning();

      if (demoOrder) {
        await db.insert(orderItems).values([
          {
            orderId: demoOrder.id,
            productId: insertedProducts[0].id,
            productName: insertedProducts[0].name,
            productSku: insertedProducts[0].sku,
            unitPrice: '28.00',
            quantity: 1,
            totalPrice: '28.00',
          },
          {
            orderId: demoOrder.id,
            productId: insertedProducts[1].id,
            productName: insertedProducts[1].name,
            productSku: insertedProducts[1].sku,
            unitPrice: '120.00',
            quantity: 1,
            totalPrice: '120.00',
          },
        ]);

        await db.insert(payments).values({
          orderId: demoOrder.id,
          method: 'cod',
          provider: 'Paiement à la livraison',
          amount: '148.00',
          status: 'paid',
          reference: 'DEMO-PAY-0001',
          notes: 'Paiement de démonstration',
        });

        await db.insert(deliveries).values({
          orderId: demoOrder.id,
          zoneName: pickupZone?.name ?? 'Retrait en magasin',
          trackingCode: 'TRK-DEMO-0001',
          carrier: 'Librairie Amine',
          status: 'delivered',
          estimatedDate: 'Aujourd’hui',
          deliveredAt: new Date(),
        });
      }
    }

    await db.insert(notifications).values({
      type: 'system',
      title: 'Boutique initialisée avec données de démonstration',
      message:
        'Pensez à configurer vos coordonnées officielles, tarifs de livraison et fiches produits dans Paramètres.',
      isRead: false,
    });

    await db.insert(adminActivityLogs).values({
      adminEmail: 'système',
      action: 'Initialisation',
      entityType: 'boutique',
      entityId: '1',
      details: 'Jeu de données de démonstration Librairie Amine créé.',
    });

    seededDone = true;
  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  }
}

export async function ensureSeeded() {
  if (seededDone) return;
  if (!seedPromise) {
    seedPromise = runSeed().finally(() => {
      seedPromise = null;
    });
  }
  await seedPromise;
}

export async function logAdminAction(params: {
  adminEmail: string;
  action: string;
  entityType: string;
  entityId?: string | number;
  details?: string;
}) {
  try {
    await db.insert(adminActivityLogs).values({
      adminEmail: params.adminEmail,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId !== undefined ? String(params.entityId) : '',
      details: params.details ?? '',
    });
  } catch (err) {
    console.error('Failed to write admin activity log:', err);
  }
}
