import "dotenv/config"; // <--- Isso ativa o cofre .env
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { promptSistema, menuPrincipal, menuSuporte } from "./flow.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ==========================================
// 🔑 CONFIGURAÇÕES SEGURAS (Lendo do .env)
// ==========================================
// AQUI ESTAVA O ERRO: Agora usamos process.env em vez da chave direta
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ZAPI_URL = `https://api.z-api.io/instances/3ECBAE4C12CFF1D2169172442EF70706/token/267C822F0A62F218E1DAFA68/send-text`;

// ==========================================
// 🧠 MEMÓRIA DE SESSÃO
// ==========================================
const userSessions = new Map();

// Função Auxiliar de Envio
async function sendWhatsApp(phone, message) {
  try {
    await fetch(ZAPI_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Client-Token": process.env.ZAPI_CLIENT_TOKEN // Lendo do .env
      },
      body: JSON.stringify({ phone, message })
    });
  } catch (error) {
    console.error("Erro no envio:", error);
  }
}

// Função IA (ChatGPT)
async function askOpenAI(userText) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: promptSistema },
        { role: "user", content: userText }
      ],
      max_tokens: 200,
      temperature: 0.5,
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Erro OpenAI:", error);
    return "Desculpe, estou recalculando. Tente novamente.";
  }
}

// ==========================================
// 📩 WEBHOOK
// ==========================================
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    const phone = body.phone || body.chatId; 
    const messageRaw = body.message || body.text?.message || body.content;
    const isFromMe = body.fromMe;

    if (isFromMe) return res.json({ status: "ignored_self" });
    if (!phone || !messageRaw) return res.json({ status: "ignored_no_data" });

    const textOriginal = String(messageRaw).trim();
    const textLower = textOriginal.toLowerCase();
    let session = userSessions.get(phone) || 'MAIN';
    let reply = "";

    console.log(`💬 ${phone} [${session}]: ${textOriginal}`);

    // 1. GATILHOS GLOBAIS
    if (['oi', 'olá', 'ola', 'menu', 'inicio', 'start', '0'].includes(textLower)) {
      userSessions.set(phone, 'MAIN');
      await sendWhatsApp(phone, menuPrincipal());
      return res.json({ success: true });
    }

    // 2. MODO HUMANO
    if (session === 'HUMAN') {
       if (textLower === '#voltarbot') {
         userSessions.set(phone, 'MAIN');
         await sendWhatsApp(phone, "🤖 Bot reativado!");
       }
       return res.json({ status: "human_mode" });
    }

    // 3. NAVEGAÇÃO
    if (session === 'MAIN') {
      if (textLower === "1") {
        reply = "💰 *Orçamento*\nConte um pouco sobre seu projeto:";
      } 
      else if (textLower === "2") {
        userSessions.set(phone, 'SUPORTE');
        reply = menuSuporte();
      } 
      else if (textLower === "3") {
        reply = "💲 *Financeiro*\nPara boletos, acesse nosso portal.";
      } 
      else if (textLower === "4") {
        userSessions.set(phone, 'HUMAN');
        reply = "✅ Transferindo para um atendente humano...";
      } 
      else {
        const aiResponse = await askOpenAI(textOriginal);
        if (aiResponse.includes("#HUMANO")) {
           userSessions.set(phone, 'HUMAN');
           reply = "Entendi, vou chamar um especialista humano. 👤";
        } else {
           reply = aiResponse;
        }
      }
    }
    else if (session === 'SUPORTE') {
      if (['1', '2', '3'].includes(textLower)) {
        reply = "✅ Ticket aberto! Digite *menu* para voltar.";
        userSessions.set(phone, 'MAIN');
      } else {
        reply = await askOpenAI("Contexto Suporte: " + textOriginal);
      }
    }

    if (reply) await sendWhatsApp(phone, reply);
    return res.json({ success: true });

  } catch (error) {
    console.error("❌ ERRO SERVER:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server Seguro rodando na porta ${PORT}`);
});