# Kazuki Store — Duitku Sandbox Starter

Starter project Vercel + Firebase Authentication + Duitku Payment Gateway v2 (sandbox).

## Struktur
- `index.html` — katalog, login/register Firebase, keranjang, checkout, tampilan QR/tautan pembayaran.
- `api/create-payment.js` — membuat transaksi Duitku di server. Harga dihitung ulang dari katalog server.
- `api/duitku-callback.js` — menerima callback, memvalidasi HMAC SHA-256, lalu memperbarui status pesanan di Firestore.
- `package.json` — dependency Firebase Admin dan QRCode.

## 1. Firebase
1. Buat project Firebase dan aplikasi Web.
2. Aktifkan Authentication: Email/Password dan Google.
3. Buat Firestore Database dan tambahkan domain Vercel ke Authorized domains.
4. Isi `firebaseConfig` di `index.html` dengan konfigurasi project sendiri.
5. Siapkan Firebase Admin service account untuk backend; simpan JSON sebagai Environment Variable `FIREBASE_SERVICE_ACCOUNT_JSON` di Vercel, jangan commit ke GitHub.

## 2. Duitku sandbox
Integrasi menggunakan endpoint Inquiry v2 sandbox: `https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry`. Signature request mengikuti dokumentasi Duitku: HMAC-SHA256 dari `merchantCode + merchantOrderId + paymentAmount`. Callback juga diverifikasi dengan HMAC-SHA256 dari `merchantCode + amount + merchantOrderId`.

Environment Variables Vercel:
- `DUITKU_ENV` = `sandbox`
- `DUITKU_MERCHANT_CODE` = kode merchant sandbox
- `DUITKU_API_KEY` = API key sandbox
- `DUITKU_PAYMENT_METHOD` = kode metode pembayaran yang aktif di akun merchant (jangan menebak kode QRIS)
- `DUITKU_RETURN_URL` = `https://DOMAIN-VERCEL-KAMU/`
- `DUITKU_CALLBACK_URL` = `https://DOMAIN-VERCEL-KAMU/api/duitku-callback`
- `FIREBASE_SERVICE_ACCOUNT_JSON` = JSON service account satu baris

QR akan dibuat dari `qrString` yang dikembalikan Duitku. Jika Duitku memberikan `paymentUrl`, tombol untuk membuka halaman pembayaran juga ditampilkan.

## 3. Deploy
1. Upload isi folder project ke root repository GitHub (bukan folder induk).
2. Import repository ke Vercel dan deploy.
3. Isi Environment Variables seperti di atas, lalu redeploy.
4. Pastikan callback URL memakai domain Vercel yang benar.

## 4. Katalog
Produk contoh dan harga ada di `index.html` (`products`) serta `api/create-payment.js` (`CATALOG`). Jika mengubah produk/harga, perbarui keduanya. Server tetap menjadi sumber harga yang dipercaya.

## Catatan keamanan
- Project ini dikunci ke sandbox; belum untuk menerima pembayaran sungguhan.
- Ini starter, bukan sistem produksi siap pakai. Sebelum penggunaan nyata perlu review keamanan, pengujian menyeluruh, penanganan expiry/refund, dan verifikasi status melalui API status Duitku.
- Jangan letakkan API Key, service account JSON, password, atau token di HTML/GitHub.
- Gunakan akun merchant dan kredensial hanya melalui proses resmi dengan pendampingan orang dewasa yang bertanggung jawab.

Dokumentasi resmi: https://docs.duitku.com/api/id/
