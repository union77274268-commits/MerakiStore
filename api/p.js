// Vercel serverless function: rich link preview for a product.
// Share links look like  https://<site>/api/p?id=<product id>
// WhatsApp / Facebook / X read the OG tags below; real visitors are sent straight to the product page.
const SUPABASE_URL = 'https://viefouzekrzoqaqpuaug.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZWZvdXpla3J6b3FhcXB1YXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMTQ4ODIsImV4cCI6MjEwMDc5MDg4Mn0.BNVufdPxOHkxdIuuEZ4ny2KPABW9UR0t6x6v1_0hOBo';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

module.exports = async (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'meraki-store-xi.vercel.app';
  const origin = 'https://' + host;
  const id = String((req.query && req.query.id) || '').slice(0, 80);
  let p = null;
  if (id) {
    try {
      const r = await fetch(SUPABASE_URL + '/rest/v1/storefront_products?select=id,name,price,mrp,image_url,description,stock&id=eq.' + encodeURIComponent(id) + '&limit=1',
        { headers: { apikey: ANON, Authorization: 'Bearer ' + ANON } });
      const j = await r.json();
      p = Array.isArray(j) && j[0] ? j[0] : null;
    } catch (e) { p = null; }
  }
  const target = origin + '/' + (p ? '#/product/' + encodeURIComponent(p.id) : '');
  const title = p ? p.name + ' — ₹' + Number(p.price) : 'Meraki — Stationery & Toys';
  const desc = p
    ? (p.stock > 0 ? 'Available now' : 'Currently out of stock') + (p.mrp && Number(p.mrp) > Number(p.price) ? ' · MRP ₹' + Number(p.mrp) : '') + ' · Quick delivery from Meraki Stationery & Toys'
    : 'Stationery, toys and art supplies delivered fast.';
  const img = p && p.image_url ? p.image_url : origin + '/og-image.png';
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta property="og:type" content="website"><meta property="og:site_name" content="Meraki Stationery &amp; Toys">' +
    '<meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="' + esc(desc) + '">' +
    '<meta property="og:image" content="' + esc(img) + '"><meta property="og:url" content="' + esc(origin + '/api/p?id=' + encodeURIComponent(id)) + '">' +
    '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="' + esc(title) + '">' +
    '<meta name="twitter:description" content="' + esc(desc) + '"><meta name="twitter:image" content="' + esc(img) + '">' +
    '<meta http-equiv="refresh" content="0;url=' + esc(target) + '"></head><body>' +
    '<script>location.replace(' + JSON.stringify(target).replace(/</g, '\\u003c') + ')</script>' +
    '<p><a href="' + esc(target) + '">Open in Meraki</a></p></body></html>';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.status(200).send(html);
};
  
