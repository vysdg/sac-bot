import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARES =====
app.use(cors());
app.use(express.json());

// ===== HEALTH CHECK =====
app.get("/", (req, res) => {
  return res.json({ status: "SAC Bot online 🚀" });
});

// ===== WEBHOOK =====
app.post("/webhook", async (req, res) => {
  try {
    console.log("📩 WEBHOOK RECEBIDO:", JSON.stringify(req.body, null, 2));

    // ===== EXTRAÇÃO DE DADOS DO Z-API =====
    const phone = req.body?.connectedPhone || req.body?.phone || null;
    const chatId = req.body?.chatId || null;
    const message = req.body?.text?.message || req.body?.message || "";
    const isStatusReply = req.body?.isStatusReply || false;
    
    // Ignora status replies e mensagens inválidas
    if (isStatusReply || !phone || !message || !chatId) {
      console.log("⏭️ Mensagem ignorada (status ou inválida)");
      return res.status(200).json({ success: true });
    }

    const text = message.toLowerCase().trim();
    console.log(`📱 Mensagem recebida: "${text}" de ${phone}`);

    let reply = "";

    // ===== MENU =====
    if (["oi", "olá", "ola", "menu", "início", "inicio"].includes(text)) {
      reply =
        "👋 Olá! Seja bem-vindo ao SAC.\n\n" +
        "1️⃣ Financeiro\n" +
        "2️⃣ Suporte Técnico\n" +
        "3️⃣ Falar com um atendente";
    }
    // ===== FINANCEIRO =====
    else if (text === "1") {
      reply =
        "💰 *Financeiro*\n\n" +
        "Aceitamos PIX, cartão e boleto.\n" +
        "⏰ Atendimento: 9h às 18h.\n\n" +
        "Digite *menu* para voltar.";
    }
    // ===== SUPORTE =====
    else if (text === "2") {
      reply =
        "🛠️ *Suporte Técnico*\n\n" +
        "Descreva seu problema que vamos te ajudar.\n\n" +
        "Digite *menu* para voltar.";
    }
    // ===== ATENDENTE =====
    else if (text === "3") {
      reply = "👤 Certo! Um atendente humano falará com você em breve.";
    }
    // ===== FALLBACK =====
    else {
      reply =
        "❓ Não entendi sua mensagem.\nDigite *menu* para ver as opções.";
    }

    console.log(`✅ Resposta preparada: ${reply.substring(0, 50)}...`);

    // ===== IMPORTANTE: Precisamos enviar via API do Z-API =====
    // O webhook só RECEBE, não ENVIA automaticamente
    // Precisamos fazer uma requisição para a API do Z-API
    
    const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE || "SUA_INSTANCIA";
    const ZAPI_TOKEN = process.env.ZAPI_TOKEN || "SEU_TOKEN";

    if (ZAPI_INSTANCE === "SUA_INSTANCIA" || ZAPI_TOKEN === "SEU_TOKEN") {
      console.log("⚠️ ATENÇÃO: Configure ZAPI_INSTANCE e ZAPI_TOKEN");
      return res.status(200).json({
        error: "Credenciais Z-API não configuradas",
        phone: phone,
        message: reply
      });
    }

    // Enviar mensagem via Z-API
    const zapiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`;
    
    const zapiResponse = await fetch(zapiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: chatId, // Z-API usa chatId
        message: reply
      })
    });

    const zapiResult = await zapiResponse.json();
    console.log("📤 Resposta enviada via Z-API:", zapiResult);

    return res.status(200).json({
      success: true,
      reply: reply
    });

  } catch (err) {
    console.error("❌ Erro no webhook:", err);
    return res.status(500).json({
      error: "Erro interno",
      details: err.message
    });
  }
});

// ===== START SERVER =====
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 SAC rodando em http://0.0.0.0:${PORT}`);
});