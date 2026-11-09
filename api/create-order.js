const crypto = require('crypto');
const products = require('./_products');
const base = () => process.env.TRIPAY_MODE === 'production'
  ? 'https://tripay.co.id/api' : 'https://tripay.co.id/api-sandbox';
const clean = (s, n) => String(s || '').replace(/[\r\n|]/g, ' ').trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const b = req.body || {};
  const p = products.find(x => x.id === b.productId);
  const target = clean(b.target, 60), name = clean(b.name, 50);
  const phone = clean(b.phone, 20), email = clean(b.email, 80);
  if (!p || !target || !name || !phone || !email)
    return res.status(400).json({ error: 'Data belum lengkap' });

  const merchant = process.env.TRIPAY_MERCHANT_CODE;
  const ref = 'INV' + Date.now();
  const signature = crypto.createHmac('sha256', process.env.TRIPAY_PRIVATE_KEY)
    .update(merchant + ref + p.price).digest('hex');

  // Tujuan (ID game/email) ikut dikirim di nama item supaya muncul lagi di callback.
  const payload = {
    method: 'QRIS', merchant_ref: ref, amount: p.price,
    customer_name: name, customer_email: email, customer_phone: phone,
    order_items: [{ name: `${p.id} | ${target}`, price: p.price, quantity: 1 }],
    expired_time: Math.floor(Date.now() / 1000) + 30 * 60,
    signature
  };

  try {
    const r = await fetch(base() + '/transaction/create', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.TRIPAY_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (!j.success) return res.status(502).json({ error: j.message || 'Gagal membuat pesanan' });
    const d = j.data;
    res.status(200).json({ reference: d.reference, qr_url: d.qr_url, checkout_url: d.checkout_url, total: d.amount + (d.fee_customer || 0), expired_time: d.expired_time });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
};
