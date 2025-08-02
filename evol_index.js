import express from 'express';
import { load } from 'cheerio';
import https from 'https';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
app.use(express.static('../site'));

function fetchNike(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (resp) => {
      let html = '';
      resp.on('data', chunk => html += chunk);
      resp.on('end', () => resolve(html));
    }).on('error', reject);
  });
}

app.get('/api/price', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Paramètre q manquant' });

  const searchUrl = q.match(/^\d{6}-\d{3}$/)
        ? `https://www.nike.com/fr/w?q=${q}`
        : `https://www.nike.com/fr/w?q=${encodeURIComponent(q)}`;

  try {
    let html = await fetchNike(searchUrl);
    let $ = load(html);

    let href = null;
    ['a[data-test="product-card__link-overlay"]',
     'a[href*="/t/"]'].forEach(sel => { if (!href) href = $(sel).first().attr('href'); });
    if (!href) return res.status(404).json({ error: 'Produit introuvable' });

    const url = href.startsWith('http') ? href : `https://www.nike.com${href}`;
    html = await fetchNike(url);
    $ = load(html);

    const model = $('h1[data-test="product-title"]').text().trim() || $('h1').text().trim();
    const ref   = url.split('/').pop().split('?')[0];

    // extraction prix (même méthode que la version stable)
    let price = '';
    const txt = $('[data-test="product-price"]').text().trim() ||
                $('.current-price').text().trim() ||
                $('.price').text().trim();
    const m = txt.match(/(\d+(?:[.,]\d{1,2}))\s*€/);
    if (m) price = m[1].replace('.', ',') + ' €';
    price = price || 'Prix non disponible';

    res.json({ model, ref, price, url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log('✅ Serveur prêt → http://localhost:3000'));