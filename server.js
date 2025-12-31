const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// ====== FLOWS (simples para teste) ======
const flows = {
  menu: () =>
    `👋 Olá! Bem-vindo ao SAC\n
1️⃣ Vendas
2️⃣ Suporte
3️⃣ Financeiro
4️⃣ Falar com humano`,

  suporte: () =>
    `🛠 Suporte Técnico\nDescreva seu problema.`,

  suporteResposta: (msg) =>
    `Recebemos sua solicitação:\n"${msg}"\nNossa equipe retornará em breve.`
};

// ====== ROTA PRINCIPAL ======
app.get("/", (req, res) => {
  res.json({ status: "SAC Bot online 🚀" });
});

// ====== SIMULAÇÃO DE WHATSAPP ======
app.post("/webhook", (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.json({ reply: flows.menu() });
  }

  if (message === "1") {
    return res.json({ reply: "💰 Setor de Vendas\nUm consultor falará com você." });
  }

  if (message === "2") {
    return res.json({ reply: flows.suporte() });
  }

  if (message === "3") {
    return res.json({
      reply: "📄 Financeiro\nAceitamos PIX, cartão e boleto.\n⏰ 9h às 18h"
    });
  }

  if (message === "4") {
    return res.json({
      reply: "👤 Atendimento humano\nAguarde um instante."
    });
  }

  return res.json({
    reply: flows.suporteResposta(message)
  });
});

// ====== PORTA (OBRIGATÓRIO NO FLY) ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 SAC rodando na porta ${PORT}`);
});
