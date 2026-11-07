const crypto = require("crypto");
const admin = require("firebase-admin");
const QRCode = require("qrcode");

function getAdmin() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON belum diatur.");
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  }
  return admin;
}

const CATALOG = {
  "web-template": { name: "Template Website", price: 15000 },
  "banner-design": { name: "Desain Banner", price: 10000 },
  "telegram-bot": { name: "Setup Bot Telegram", price: 25000 },
  "web-consult": { name: "Konsultasi Website", price: 10000 }
};

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Login diperlukan." });
    const firebase = getAdmin();
    const user = await firebase.auth().verifyIdToken(token);

    const { items, phone = "" } = req.body || {};
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "Keranjang kosong." });

    let amount = 0;
    const details = [];
    for (const row of items) {
      const product = CATALOG[row.id];
      const quantity = Number(row.quantity);
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        return res.status(400).json({ error: "Item atau jumlah tidak valid." });
      }
      amount += product.price * quantity;
      details.push({ name: product.name, price: product.price, quantity });
    }
    if (amount < 1000) return res.status(400).json({ error: "Nominal transaksi tidak valid." });

    const merchantCode = process.env.DUITKU_MERCHANT_CODE;
    const apiKey = process.env.DUITKU_API_KEY;
    const paymentMethod = process.env.DUITKU_PAYMENT_METHOD;
    if (!merchantCode || !apiKey || !paymentMethod) {
      return res.status(503).json({ error: "Atur DUITKU_MERCHANT_CODE, DUITKU_API_KEY, dan DUITKU_PAYMENT_METHOD di Vercel." });
    }

    const orderId = "KZK" + Date.now() + crypto.randomBytes(3).toString("hex").toUpperCase();
    const signature = crypto.createHmac("sha256", apiKey)
      .update(merchantCode + orderId + amount)
      .digest("hex");
    // Starter ini dikunci ke sandbox agar tidak membuat tagihan sungguhan.
    const endpoint = "https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry";

    const payload = {
      merchantCode,
      paymentAmount: amount,
      merchantOrderId: orderId,
      productDetails: details.map(x => `${x.name} x${x.quantity}`).join(", ").slice(0, 250),
      additionalParam: "",
      merchantUserInfo: user.uid,
      email: user.email || "customer@example.com",
      paymentMethod,
      customerVaName: (user.name || user.email || "Kazuki Customer").slice(0, 20),
      phoneNumber: String(phone).slice(0, 50),
      itemDetails: details,
      customerDetail: {
        firstName: (user.name || "Customer").slice(0, 50),
        email: user.email || "customer@example.com",
        phoneNumber: String(phone).slice(0, 50)
      },
      returnUrl: process.env.DUITKU_RETURN_URL,
      callbackUrl: process.env.DUITKU_CALLBACK_URL,
      signature,
      expiryPeriod: 30
    };

    if (!payload.returnUrl || !payload.callbackUrl) {
      return res.status(503).json({ error: "DUITKU_RETURN_URL dan DUITKU_CALLBACK_URL belum diatur." });
    }

    const orderRef = firebase.firestore().collection("orders").doc(orderId);
    await orderRef.set({
      uid: user.uid, email: user.email || null, amount, items: details,
      status: "CREATING", createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const duitkuResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await duitkuResponse.json();
    if (!duitkuResponse.ok || String(result.statusCode) !== "00") {
      await orderRef.update({ status: "FAILED_TO_CREATE", providerMessage: result.statusMessage || result.Message || "Duitku error" });
      return res.status(502).json({ error: result.statusMessage || result.Message || "Duitku menolak permintaan transaksi." });
    }

    let qrImageDataUrl = null;
    if (result.qrString) {
      qrImageDataUrl = await QRCode.toDataURL(result.qrString, { width: 320, margin: 2, errorCorrectionLevel: "M" });
    }

    await orderRef.update({
      status: "PENDING", duitkuReference: result.reference || null,
      paymentCode: result.vaNumber || null, paymentMethod,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({
      merchantOrderId: orderId, paymentUrl: result.paymentUrl || null,
      qrString: result.qrString || null, qrImageDataUrl,
      vaNumber: result.vaNumber || null, reference: result.reference || null, amount
    });
  } catch (error) {
    console.error("create-payment:", error.message);
    return res.status(500).json({ error: "Tidak dapat membuat tagihan. Periksa konfigurasi server." });
  }
};
