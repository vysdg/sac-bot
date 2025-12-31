import express from "express";
import cors from "cors";

const app = express();

// ===== CONFIG =====
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARES =====
app.use(cors());
app.use(express.json());

// ===== HEALTH CHECK (OBRIGATÓRIO NO FLY) =====
app.get("/", (req, res) => {
  return res.json({ status: "SAC Bot online 🚀" });
});

// ===== WEBHOOK =====
app.post("/webhook", (req, res) => {
  try {
    const { phone, message } = req.body || {};

    if (!phone || !message) {
      return res.json({
        reply:
          "❗ Mensagem inválida.\nEnvie um JSON com:\nphone e message.",
      });
    }

    const text = message.toLowerCase().trim();

    // ===== MENU =====
    if (["oi", "olá", "ola", "menu"].includes(text)) {
      return res.json({
        reply:
          "👋 Olá! Seja bem-vindo ao SAC.\n\n" +
          "1️⃣ Financeiro\n" +
          "2️⃣ Suporte Técnico\n" +
          "3️⃣ Falar com um atendente",
      });
    }

    if (text === "1") {
      return res.json({
        reply:
          "💰 *Financeiro*\nAceitamos PIX, cartão e boleto.\n⏰ Atendimento: 9h às 18h.",
      });
    }

    if (text === "2") {
      return res.json({
        reply:
          "🛠️ *Suporte Técnico*\nDescreva seu problema que vamos te ajudar.",
      });
    }

    if (text === "3") {
      return res.json({
        reply:
          "👤 Certo! Um atendente humano falará com você em breve.",
      });
    }

    // ===== FALLBACK =====
    return res.json({
      reply:
        "❓ Não entendi sua mensagem.\nDigite *menu* para ver as opções.",
    });
  } catch (err) {
    console.error("Erro no webhook:", err);
    return res.status(500).json({
      reply: "⚠️ Erro interno. Tente novamente.",
    });
  }
});

// ===== START SERVER (CRÍTICO) =====
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 SAC rodando em http://0.0.0.0:${PORT}`);
});
