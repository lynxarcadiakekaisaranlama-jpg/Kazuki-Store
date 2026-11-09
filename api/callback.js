const crypto = require('crypto');

// Baca body mentah (jangan sentuh req.body) karena tanda tangan dihitung dari body asli.
const raw = req => new Promise((ok, fail) => {
  const c = []; req.on('data', d => c.push(d));
  req.on('end', () => ok(Buffer.concat(c).toString('utf8'))); req.on('error', fail);
});

// Isi bagian ini: kirim pesanan ke provider top up (mis. Digiflazz) atau kirim akun/lisensi.
async function fulfill(order) {
  const [productId, target] = order.order_items[0].name.split(' | ');
  console.log('PAID', order.merchant_ref, productId, target);
  // TODO: panggil API provider di sini.
  // Simpan merchant_ref yang sudah diproses (database) agar tidak diproses dua kali kalau callback dikirim ulang.
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const body = await raw(req);
  const expected = crypto.createHmac('sha256', process.env.TRIPAY_PRIVATE_KEY).update(body).digest('hex');
  const got = String(req.headers['x-callback-signature'] || '');
  if (got.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected)))
    return res.status(401).json({ success: false });
  if (req.headers['x-callback-event'] !== 'payment_status') return res.status(200).json({ success: true });

  const order = JSON.parse(body);
  if (order.status === 'PAID') await fulfill(order);
  res.status(200).json({ success: true });
};
