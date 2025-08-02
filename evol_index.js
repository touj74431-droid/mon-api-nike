// evol_index.js  (final corrigé)
import express from 'express';
import { load } from 'cheerio';
import https   from 'https';

// Désactive la vérification TLS pour Render
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app  = express();
const PORT = process.env.PORT || 3000;

// Sert le dossier "site" (où se trouve evol_index.html)
app.use(express.static('site'));

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

// Route racine : redirige vers le site statique
app.get('/', (_req, res) => {
  res.sendFile('evol_index.html', { root: 'site' });
});

// Route API
app.get('/api/price', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Paramètre q manquant' });

  const searchUrl = `https://www.nike.com/fr/w?q=${encodeURIComponent(q)}`;

  try {
    let html = await fetchNike(searchUrl);
    let $ = load(html);

    const href =
      $('a[data-test="product-card__link-overlay"]').first().attr('href') ||
      $('a[href*="/t/"]').first().attr('href');

    if (!href) return res.status(404).json({ error: 'Produit introuvable' });

    const url = href.startsWith('http') ? href : `https://www.nike.com${href}`;
    html = await fetchNike(url);
    $ = load(html);

    const model = $('h1[data-test="product-title"]').text().trim() || $('h1').text().trim();
    const ref   = url.split('/').pop().split('?')[0];

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

app.listen(PORT, () => console.log(`✅ Serveur prêt → http://localhost:${PORT}`));
