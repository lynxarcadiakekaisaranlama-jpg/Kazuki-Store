// ==========================================
// API PAKASIR — BACKEND PROXY
// ==========================================
const PAKASIR_BASE_URL = "https://api.pakasir.id/v2";
const PAKASIR_API_KEY = process.env.PAKASIR_API_KEY || "";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  if (req.method === "OPTIONS") return res.status(200).end();
  
  if (!PAKASIR_API_KEY) {
    return res.status(500).json({
      success: false,
      message: "API Key belum diatur di server"
    });
  }

  try {
    const { game, user_id, zone_id, product_id, quantity } = req.body;
    
    const response = await fetch(`${PAKASIR_BASE_URL}/order`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PAKASIR_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        game,
        user_id,
        zone_id,
        product_id,
        quantity
      })
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Koneksi ke Pakasir gagal"
    });
  }
}
