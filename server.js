import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { promptSistema, menuPrincipal, menuSuporte, menuSolucoes, menuPlanos } from "./flow.js";
import { initDb, getSession, setSession, saveHistory } from "./database.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// INICIA O BANCO DE DADOS
initDb();

// 🔑 CONFIGURAÇÕES
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ZAPI_URL = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE}/token/${process.env.ZAPI_TOKEN}/send-text`;

// 🛠️ FUNÇÕES AUXILIARES
async function sendWhatsApp(phone, message) {
  try {
    await fetch(ZAPI_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Client-Token": process.env.ZAPI_CLIENT_TOKEN
      },
      body: JSON.stringify({ phone, message })
    });
    await saveHistory(phone, 'assistant', message);
  } catch (error) {
    console.error("Erro no envio:", error);
  }
}

async function askOpenAI(userText) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: promptSistema },
        { role: "user", content: userText }
      ],
      max_tokens: 250,
      temperature: 0.7,
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Erro OpenAI:", error);
    return "Estou com muitas solicitações. Digite *menu* para voltar.";
  }
}

// 📩 WEBHOOK
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

    // 1. SALVA HISTÓRICO
    await saveHistory(phone, 'user', textOriginal);

    // 2. RECUPERA SESSÃO
    let session = await getSession(phone);
    let reply = "";

    console.log(`💬 ${phone} [${session}]: ${textOriginal}`);

    // =====================================================
    // 🚨 GATILHOS GLOBAIS (Reset)
    // =====================================================
    // Funciona em qualquer lugar para salvar o usuário perdido
    if (['oi', 'olá', 'ola', 'menu', 'inicio', 'start', '0'].includes(textLower)) {
      await setSession(phone, 'MAIN');
      await sendWhatsApp(phone, menuPrincipal());
      return res.json({ success: true });
    }

    if (session === 'HUMAN') {
       if (textLower === '#voltarbot') {
         await setSession(phone, 'MAIN');
         await sendWhatsApp(phone, "🤖 Assistente Nexlyr reativado!");
       }
       return res.json({ status: "human_mode" });
    }

    // =====================================================
    // 🕹️ LÓGICA DE NAVEGAÇÃO
    // =====================================================

    // --- 1. MENU PRINCIPAL ---
    if (session === 'MAIN') {
      
      // SOLUÇÕES -> Agora muda para a sessão SOLUCOES
      if (textLower === "1") {
        await setSession(phone, 'SOLUCOES'); // <--- TRAVA AQUI
        reply = menuSolucoes(); 
      } 
      
      // PLANOS -> Agora muda para a sessão PLANOS
      else if (textLower === "2") {
        await setSession(phone, 'PLANOS'); // <--- TRAVA AQUI
        reply = menuPlanos();
      } 
      
      // JÁ SOU CLIENTE
      else if (textLower === "3") {
        await setSession(phone, 'SUPORTE');
        reply = menuSuporte();
      } 
      
      // FALAR COM HUMANO
      else if (textLower === "4") {
        await setSession(phone, 'HUMAN');
        reply = "✅ Entendido. Estou notificando nossa equipe comercial.\n\nAguarda um instante que um de nossos consultores vai assumir aqui! 👤";
      } 
      
      // IA (PERGUNTAS ABERTAS)
      else {
        const aiResponse = await askOpenAI(textOriginal);
        if (aiResponse.includes("#HUMANO")) {
           await setSession(phone, 'HUMAN');
           reply = "Vou transferir para um especialista humano. 👤";
        } else {
           reply = aiResponse;
        }
      }
    }

    // --- 2. DENTRO DE SOLUÇÕES ---
    // Aqui tratamos o cliente que está lendo sobre as soluções
    else if (session === 'SOLUCOES') {
        if (textLower === "4") {
             await setSession(phone, 'HUMAN');
             reply = "Ótima escolha! Um consultor vai te ajudar a implementar essa solução. 👤";
        } else {
            // Qualquer outra coisa (tipo digitar 1, 2 ou 3 querendo selecionar)
            // A gente avisa como prosseguir
            reply = "Para contratar qualquer uma dessas soluções, digite *4* para falar com um consultor.\n\nOu digite *menu* para voltar.";
        }
    }

    // --- 3. DENTRO DE PLANOS ---
    else if (session === 'PLANOS') {
        if (textLower === "4") {
             await setSession(phone, 'HUMAN');
             reply = "Perfeito. Vamos montar uma proposta personalizada para você. Aguarde um momento. 👤";
        } else {
            reply = "Gostou dos planos? Digite *4* para receber uma proposta formal.\n\nOu digite *menu* para voltar.";
        }
    }

    // --- 4. DENTRO DE SUPORTE (Já cliente) ---
    else if (session === 'SUPORTE') {
      if (['1', '2', '3'].includes(textLower)) {
        reply = "✅ Solicitação registrada! Nossa equipe técnica entrará em contato em breve.\n\nDigite *menu* para voltar.";
        await setSession(phone, 'MAIN');
      } else {
        reply = await askOpenAI("Cliente (SUPORTE): " + textOriginal);
      }
    }

    // ENVIO
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
  console.log(`🚀 NEXLYR Bot Inteligente rodando na porta ${PORT}`);
});