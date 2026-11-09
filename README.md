# Toko Top Up (Vercel + QRIS Tripay)

## Environment Variables (Vercel > Settings > Environment Variables)
- `TRIPAY_API_KEY`
- `TRIPAY_PRIVATE_KEY`
- `TRIPAY_MERCHANT_CODE`
- `TRIPAY_MODE` = `sandbox` (uji coba) atau `production`

## Langkah
1. Ganti produk & harga di `api/_products.js`.
2. Upload semua file ke repo GitHub (timpa yang lama), lalu commit.
3. Isi Environment Variables, lalu Redeploy.
4. Di dashboard Tripay, isi **URL Callback**: `https://DOMAINMU/api/callback`
5. Tes di mode sandbox sebelum pindah ke production.

## Yang masih harus kamu isi
- `api/callback.js` fungsi `fulfill()`: sambungkan ke API provider top up (mis. Digiflazz) atau pengiriman akun/lisensi resmi.
- Untuk toko sungguhan, simpan pesanan di database (Supabase/Neon) agar tidak diproses dobel dan ada riwayat.
