import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { promptSistema, menuPrincipal, menuSuporte } from "./flow.js";
// Importamos as novas funções do banco de dados
import { initDb, getSession, setSession, saveHistory } from "./database.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// INICIA O BANCO DE DADOS AO LIGAR
initDb();

// ==========================================
// 🔑 CONFIGURAÇÕES
// ==========================================
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ZAPI_URL = `https://api.z-api.io/instances/3ECBAE4C12CFF1D2169172442EF70706/token/267C822F0A62F218E1DAFA68/send-text`;

// Função Auxiliar de Envio (Agora salva no histórico também!)
async function sendWhatsApp(phone, message) {
  try {
    // 1. Envia para Z-API
    await fetch(ZAPI_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Client-Token": process.env.ZAPI_CLIENT_TOKEN
      },
      body: JSON.stringify({ phone, message })
    });

    // 2. Salva o que o BOT respondeu no banco
    await saveHistory(phone, 'assistant', message);

  } catch (error) {
    console.error("Erro no envio:", error);
  }
}

// Função IA
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
    return "Estou com lentidão, tente novamente.";
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

    // 💾 SALVA O QUE O CLIENTE MANDOU NO BANCO
    await saveHistory(phone, 'user', textOriginal);

    // 🔄 RECUPERA A SESSÃO DO BANCO (Substitui o Map)
    let session = await getSession(phone);
    let reply = "";

    console.log(`💬 ${phone} [${session}]: ${textOriginal}`);

    // 1. GATILHOS GLOBAIS
    if (['oi', 'olá', 'ola', 'menu', 'inicio', 'start', '0'].includes(textLower)) {
      await setSession(phone, 'MAIN'); // Salva no banco
      await sendWhatsApp(phone, menuPrincipal());
      return res.json({ success: true });
    }

    // 2. MODO HUMANO
    if (session === 'HUMAN') {
       if (textLower === '#voltarbot') {
         await setSession(phone, 'MAIN');
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
        await setSession(phone, 'SUPORTE'); // Atualiza banco
        reply = menuSuporte();
      } 
      else if (textLower === "3") {
        reply = "💲 *Financeiro*\nPara boletos, acesse nosso portal.";
      } 
      else if (textLower === "4") {
        await setSession(phone, 'HUMAN');
        reply = "✅ Transferindo para um atendente humano...";
      } 
      else {
        // IA
        const aiResponse = await askOpenAI(textOriginal);
        if (aiResponse.includes("#HUMANO")) {
           await setSession(phone, 'HUMAN');
           reply = "Entendi, vou chamar um especialista humano. 👤";
        } else {
           reply = aiResponse;
        }
      }
    }
    else if (session === 'SUPORTE') {
      if (['1', '2', '3'].includes(textLower)) {
        reply = "✅ Ticket aberto! Digite *menu* para voltar.";
        await setSession(phone, 'MAIN');
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
  console.log(`🚀 Server com Banco de Dados rodando na porta ${PORT}`);
});