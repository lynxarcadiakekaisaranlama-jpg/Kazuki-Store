const crypto = require("crypto");
const admin = require("firebase-admin");
const querystring = require("querystring");

function getAdmin() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error("Firebase Admin belum dikonfigurasi.");
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  }
  return admin;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  try {
    const body = typeof req.body === "string" ? querystring.parse(req.body) : (req.body || {});
    const { merchantCode, amount, merchantOrderId, resultCode, signature, reference } = body;
    const code = process.env.DUITKU_MERCHANT_CODE;
    const key = process.env.DUITKU_API_KEY;
    if (!code || !key || merchantCode !== code || !amount || !merchantOrderId || !signature) {
      return res.status(400).send("Invalid callback");
    }

    const expected = crypto.createHmac("sha256", key)
      .update(String(merchantCode) + String(amount) + String(merchantOrderId))
      .digest("hex");
    const received = Buffer.from(String(signature).toLowerCase(), "utf8");
    const expectedBuffer = Buffer.from(expected.toLowerCase(), "utf8");
    if (received.length !== expectedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, received)) {
      return res.status(401).send("Invalid signature");
    }

    const firebase = getAdmin();
    const orderRef = firebase.firestore().collection("orders").doc(String(merchantOrderId));
    const order = await orderRef.get();
    if (!order.exists || Number(order.data().amount) !== Number(amount)) {
      return res.status(404).send("Order not found");
    }

    // Callback hanya memperbarui status setelah signature dan nominal tervalidasi.
    // Status PAID tidak boleh diturunkan oleh callback duplikat yang terlambat.
    await firebase.firestore().runTransaction(async (tx) => {
      const fresh = await tx.get(orderRef);
      if (!fresh.exists) throw new Error("Order not found");
      const current = fresh.data();
      if (Number(current.amount) !== Number(amount)) throw new Error("Amount mismatch");
      const nextStatus = String(resultCode) === "00" ? "PAID" : "FAILED";
      tx.update(orderRef, {
        status: current.status === "PAID" ? "PAID" : nextStatus,
        duitkuReference: reference || current.duitkuReference || null,
        callbackReceivedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    return res.status(200).send("SUCCESS");
  } catch (error) {
    console.error("duitku-callback:", error.message);
    return res.status(500).send("Callback processing error");
  }
};
