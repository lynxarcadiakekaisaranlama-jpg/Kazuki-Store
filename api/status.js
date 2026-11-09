const base = () => process.env.TRIPAY_MODE === 'production'
  ? 'https://tripay.co.id/api' : 'https://tripay.co.id/api-sandbox';

module.exports = async (req, res) => {
  const ref = String(req.query.ref || '');
  if (!/^[A-Za-z0-9-]+$/.test(ref)) return res.status(400).json({ error: 'ref tidak valid' });
  try {
    const r = await fetch(base() + '/transaction/detail?reference=' + ref, {
      headers: { Authorization: 'Bearer ' + process.env.TRIPAY_API_KEY }
    });
    const j = await r.json();
    res.status(200).json({ status: j.success ? j.data.status : 'UNKNOWN' });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
};
