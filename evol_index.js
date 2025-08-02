// evol_index.js
import express from 'express';
import { load } from 'cheerio';
import https   from 'https';

// Désactivation temporaire du check TLS
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
const PORT = process.env.PORT || 3000;

// Servir les fichiers statiques (optionnel)
app.use(express.static('../site'));

// Helper pour fetch
function fetchNike(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (resp) => {
      let html = '';
      resp.on('data', chunk => (html += chunk));
      resp.on('end', () => resolve(html));
    }).on('error', reject);
  });
}

// Route racine : guide rapide
app.get('/', (_req, res) => {
  res.json({
    message: 'API Nike Court Vision Mid – Service live 🚀',
    usage:   'GET /api/price?q=CU6620-001',
    example: 'https://mon-api-nike.onrender.com/api/price?q=Dunk%20Low'
  });
});

// Route principale
app.get('/api/price', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Paramètre q manquant' });

  const searchUrl = `https://www.nike.com/fr/w?q=${encodeURIComponent(q)}`;

  try {
    let html = await fetchNike(searchUrl);
    let $ = load(html);

    // Sélecteurs Nike actuels
    const href =
      $('a[data-test="product-card__link-overlay"]').first().attr('href') ||
      $('a[href*="/t/"]').first().attr('href');

    if (!href)
      return res.status(404).json({ error: 'Produit introuvable sur Nike' });

    const url = href.startsWith('http') ? href : `https://www.nike.com${href}`;
    html = await fetchNike(url);
    $ = load(html);

    const model = $('h1[data-test="product-title"]').text().trim() || $('h1').text().trim();
    const ref   = url.split('/').pop().split('?')[0];

    // Extraction prix
    const txt =
      $('[data-test="product-price"]').text().trim() ||
      $('.current-price').text().trim() ||
      $('.price').text().trim();
    const m = txt.match(/(\d+(?:[.,]\d{1,2}))\s*€/);
    const price = m ? m[1].replace('.', ',') + ' €' : 'Prix non disponible';

    res.json({ model, ref, price, url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Lancement
app.listen(PORT, () => console.log(`✅ Serveur prêt → http://localhost:${PORT}`));
