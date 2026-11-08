// ==========================================
// NOFBOX API — Proxy Server
// ==========================================
const NOFBOX_BASE_URL = "https://api.nofbox.com/v1";
const NOFBOX_APP_ID = "briagviq";
const NOFBOX_API_KEY = process.env.NOFBOX_API_KEY || "";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-App-ID, X-API-Key");
  
  if (req.method === "OPTIONS") return res.status(200).end();
  
  if (!NOFBOX_API_KEY) {
    return res.status(500).json({
      success: false,
      message: "API Key belum diatur di server"
    });
  }

  try {
    const { game, user_id, zone_id, amount } = req.body;
    
    const response = await fetch(`${NOFBOX_BASE_URL}/order/create`, {
      method: "POST",
      headers: {
        "X-App-ID": NOFBOX_APP_ID,
        "X-API-Key": NOFBOX_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        game,
        user_id,
        zone_id,
        amount
      })
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Koneksi ke Nofbox gagal"
    });
  }
}
