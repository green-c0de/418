import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import publicRoutes from './src/server/routes/public.ts';
import accountRoutes from './src/server/routes/account.ts';
import adminRoutes from './src/server/routes/admin.ts';
import { db } from './src/db/index.ts';
import { categories, products } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  const uploadsDir = path.resolve(__dirname, 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // API routes
  app.use('/api', publicRoutes);
  app.use('/api', accountRoutes);
  app.use('/api/admin', adminRoutes);

  // SEO endpoints
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send('User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: /sitemap.xml\n');
  });

  app.get('/sitemap.xml', async (req, res) => {
    try {
      const origin = `${req.protocol}://${req.get('host')}`;
      const activeCats = await db.select().from(categories).where(eq(categories.isActive, true));
      const activeProds = await db.select().from(products).where(eq(products.status, 'active'));
      const urls = [
        '/',
        '/boutique',
        '/suivi',
        '/a-propos',
        '/contact',
        ...activeCats.map((c) => `/boutique?category=${c.slug}`),
        ...activeProds.map((p) => `/produit/${p.slug}`),
      ];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${origin}${u}</loc></url>`).join('\n')}
</urlset>`;
      res.type('application/xml').send(xml);
    } catch {
      res.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Librairie Amine server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
