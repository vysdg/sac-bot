import "dotenv/config"; // Ativa o cofre .env
import express from "express";
import cors from "cors";
import OpenAI from "openai";
// ⚠️ Importamos as novas funções de menu da Nexlyr aqui
import { promptSistema, menuPrincipal, menuSuporte, menuSolucoes, menuPlanos } from "./flow.js";
// Importamos as funções do banco de dados
import { initDb, getSession, setSession, saveHistory } from "./database.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// INICIA O BANCO DE DADOS AO LIGAR O SERVIDOR
initDb();

// ==========================================
// 🔑 CONFIGURAÇÕES (Lendo do .env)
// ==========================================
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ZAPI_URL = `https://api.z-api.io/instances/3ECBAE4C12CFF1D2169172442EF70706/token/267C822F0A62F218E1DAFA68/send-text`;

// ==========================================
// 🛠️ FUNÇÕES AUXILIARES
// ==========================================

// Função de Envio (Salva no histórico também!)
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

// Função IA (ChatGPT)
async function askOpenAI(userText) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: promptSistema },
        { role: "user", content: userText }
      ],
      max_tokens: 250, // Aumentei um pouco para respostas melhores
      temperature: 0.7, // Um pouco mais criativo para vender
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Erro OpenAI:", error);
    // Se der erro de cota ou conexão
    return "No momento estou com muitas solicitações. Tente digitar *menu* para ver as opções manuais.";
  }
}

// ==========================================
// 📩 WEBHOOK (Onde a mágica acontece)
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

    // 💾 1. SALVA O QUE O CLIENTE MANDOU NO BANCO
    await saveHistory(phone, 'user', textOriginal);

    // 🔄 2. RECUPERA A SESSÃO DO BANCO
    let session = await getSession(phone);
    let reply = "";

    console.log(`💬 ${phone} [${session}]: ${textOriginal}`);

    // =====================================================
    // 🚨 GATILHOS GLOBAIS (Reset e Saída)
    // =====================================================
    if (['oi', 'olá', 'ola', 'menu', 'inicio', 'start', '0'].includes(textLower)) {
      await setSession(phone, 'MAIN'); // Reseta para o inicio
      await sendWhatsApp(phone, menuPrincipal());
      return res.json({ success: true });
    }

    // Se estiver em modo humano, o bot fica mudo
    if (session === 'HUMAN') {
       // Comando secreto para voltar o bot
       if (textLower === '#voltarbot') {
         await setSession(phone, 'MAIN');
         await sendWhatsApp(phone, "🤖 Assistente Nexlyr reativado!");
       }
       return res.json({ status: "human_mode" });
    }

    // =====================================================
    // 🕹️ LÓGICA DE NAVEGAÇÃO DA NEXLYR
    // =====================================================

    // --- MENU PRINCIPAL ---
    if (session === 'MAIN') {
      
      // 1. SOLUÇÕES (Texto Informativo)
      if (textLower === "1") {
        reply = menuSolucoes(); 
        // Mantemos a sessão em MAIN para ele poder escolher outra coisa depois
      } 
      
      // 2. PLANOS E PREÇOS (Texto Informativo)
      else if (textLower === "2") {
        reply = menuPlanos();
        // Mantemos em MAIN
      } 
      
      // 3. JÁ SOU CLIENTE (Vai para submenu)
      else if (textLower === "3") {
        await setSession(phone, 'SUPORTE'); // <--- MUDA DE FASE
        reply = menuSuporte();
      } 
      
      // 4. FALAR COM HUMANO (Transbordo)
      else if (textLower === "4") {
        await setSession(phone, 'HUMAN'); // <--- TRAVA O BOT
        reply = "✅ Entendido. Estou notificando nossa equipe comercial.\n\nAguarda um instante que um de nossos consultores vai assumir aqui! 👤";
      } 
      
      // NÃO DIGITOU NÚMERO? -> VAI PARA A IA VENDEDORA 🧠
      else {
        const aiResponse = await askOpenAI(textOriginal);
        
        // Se a IA achar que precisa de humano, ela manda a tag #HUMANO
        if (aiResponse.includes("#HUMANO")) {
           await setSession(phone, 'HUMAN');
           reply = "Compreendo. Essa questão é específica, vou transferir para um especialista humano. 👤";
        } else {
           reply = aiResponse;
        }
      }
    }

    // --- MENU SUPORTE (Para quem já é cliente) ---
    else if (session === 'SUPORTE') {
      if (['1', '2', '3'].includes(textLower)) {
        reply = "✅ Solicitação registrada! Nossa equipe técnica entrará em contato em breve.\n\nDigite *menu* para voltar.";
        await setSession(phone, 'MAIN'); // Reseta após o ticket
      } else {
        // IA contextualizada no suporte
        reply = await askOpenAI("O cliente já é da base e está no menu de Suporte. A dúvida dele é: " + textOriginal);
      }
    }

    // ==========================================
    // 📤 ENVIO FINAL
    // ==========================================
    if (reply) {
      await sendWhatsApp(phone, reply);
    }

    return res.json({ success: true });

  } catch (error) {
    console.error("❌ ERRO SERVER:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 NEXLYR Bot rodando na porta ${PORT}`);
});