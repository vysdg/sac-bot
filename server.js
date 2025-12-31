import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());

/* =========================
   DATABASE
========================= */
const db = await open({
  filename: "/data/leads.db",
  driver: sqlite3.Database,
});

await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE,
    state TEXT
  )
`);

/* =========================
   HELPERS
========================= */
async function getUser(phone) {
  return db.get("SELECT * FROM users WHERE phone = ?", phone);
}

async function createUser(phone) {
  await db.run(
    "INSERT INTO users (phone, state) VALUES (?, ?)",
    phone,
    "MENU"
  );
}

async function updateState(phone, state) {
  await db.run(
    "UPDATE users SET state = ? WHERE phone = ?",
    state,
    phone
  );
}

/* =========================
   MESSAGES
========================= */
function menuMessage() {
  return (
    "👋 Olá! Seja bem-vindo ao SAC.\n\n" +
    "Escolha uma opção:\n" +
    "1️⃣ Financeiro\n" +
    "2️⃣ Suporte Técnico\n" +
    "3️⃣ Falar com um atendente"
  );
}

function fallbackHumano(userMessage) {
  return (
    "Recebemos sua solicitação:\n\n" +
    `"${userMessage}"\n\n` +
    "Nossa equipe retornará em breve."
  );
}

/* =========================
   ROUTES
========================= */
app.get("/", (req, res) => {
  res.json({ status: "SAC Bot online 🚀" });
});

app.post("/webhook", async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        error: "phone e message são obrigatórios",
      });
    }

    let user = await getUser(phone);

    if (!user) {
      await createUser(phone);
      return res.json({ reply: menuMessage() });
    }

    switch (user.state) {
      case "MENU":
        if (message === "1") {
          await updateState(phone, "HUMANO");
          return res.json({
            reply: "💰 Encaminhando para o Financeiro. Aguarde.",
          });
        }

        if (message === "2") {
          await updateState(phone, "HUMANO");
          return res.json({
            reply: "🛠️ Encaminhando para o Suporte Técnico. Aguarde.",
          });
        }

        if (message === "3") {
          await updateState(phone, "HUMANO");
          return res.json({
            reply: "👩‍💼 Encaminhando para um atendente humano.",
          });
        }

        return res.json({
          reply:
            "❌ Opção inválida.\n\n" +
            "1️⃣ Financeiro\n" +
            "2️⃣ Suporte Técnico\n" +
            "3️⃣ Falar com um atendente",
        });

      case "HUMANO":
      default:
        return res.json({
          reply: fallbackHumano(message),
        });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

app.post("/reset", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "phone obrigatório" });
  }

  await updateState(phone, "MENU");

  res.json({ ok: true, message: "Estado resetado" });
});

/* =========================
   SERVER (FLY FIX 🔥)
========================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 SAC Bot rodando em 0.0.0.0:${PORT}`);
});
