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

// ==========================================
// 🚨 CONFIGURAÇÃO DO ADMINISTRADOR (VOCÊ)
// ==========================================
const ADMIN_PHONE = "5511990190381"; // Seu número configurado para receber alertas

// ==========================================
// 🔑 CONFIGURAÇÕES DE API
// ==========================================
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ZAPI_URL = `https://api.z-api.io/instances/3ECBAE4C12CFF1D2169172442EF70706/token/267C822F0A62F218E1DAFA68/send-text`;

// ==========================================
// 🛠️ FUNÇÕES AUXILIARES
// ==========================================

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
    // Só salva no histórico se NÃO for mensagem para o Admin (para não sujar o banco)
    if (phone !== ADMIN_PHONE) {
        await saveHistory(phone, 'assistant', message);
    }
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

    // 1. SALVA HISTÓRICO DO CLIENTE
    await saveHistory(phone, 'user', textOriginal);

    // 2. RECUPERA SESSÃO
    let session = await getSession(phone);
    let reply = "";

    console.log(`💬 ${phone} [${session}]: ${textOriginal}`);

    // =====================================================
    // 🚨 GATILHOS GLOBAIS (Reset)
    // =====================================================
    if (['oi', 'olá', 'ola', 'menu', 'inicio', 'start', '0'].includes(textLower)) {
      await setSession(phone, 'MAIN');
      await sendWhatsApp(phone, menuPrincipal());
      return res.json({ success: true });
    }

    // MODO HUMANO: Permite voltar ao bot com comando secreto
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
      
      // OPÇÃO 1: SOLUÇÕES
      if (textLower === "1") {
        await setSession(phone, 'SOLUCOES');
        reply = menuSolucoes(); 
      } 
      
      // OPÇÃO 2: PLANOS
      else if (textLower === "2") {
        await setSession(phone, 'PLANOS'); 
        reply = menuPlanos();
      } 
      
      // OPÇÃO 3: SUPORTE (JÁ CLIENTE)
      else if (textLower === "3") {
        await setSession(phone, 'SUPORTE');
        reply = menuSuporte();
      } 
      
      // OPÇÃO 4: FALAR COM HUMANO (ACIONA ALERTA)
      else if (textLower === "4") {
        await setSession(phone, 'HUMAN');
        
        reply = "✅ Entendido. Já notifiquei nossa equipe comercial.\n\nAguarda um instante que um de nossos consultores vai assumir aqui! 👤";
        
        // 🚨 ALERTA PARA O ADMIN (VOCÊ)
        await sendWhatsApp(ADMIN_PHONE, `🚨 *LEAD QUENTE! (Menu)* 🔥\n\nCliente: *${phone}*\nSolicitou atendimento humano via Menu.\n\n👉 Link: https://wa.me/${phone}`);
      } 
      
      // IA (PERGUNTAS ABERTAS)
      else {
        const aiResponse = await askOpenAI(textOriginal);
        
        if (aiResponse.includes("#HUMANO")) {
           await setSession(phone, 'HUMAN');
           reply = "Compreendo. Essa questão é específica, vou transferir para um especialista humano. 👤";
           
           // 🚨 ALERTA PARA O ADMIN (VOCÊ)
           await sendWhatsApp(ADMIN_PHONE, `🚨 *TRANSBORDO IA* 🤖\n\nCliente: *${phone}*\nA IA detectou necessidade humana.\nMotivo: "${textOriginal}"\n\n👉 Link: https://wa.me/${phone}`);

        } else {
           reply = aiResponse;
        }
      }
    }

    // --- 2. DENTRO DE SOLUÇÕES ---
    else if (session === 'SOLUCOES') {
        if (textLower === "4") {
             await setSession(phone, 'HUMAN');
             reply = "Ótima escolha! Um consultor vai te ajudar a implementar essa solução. 👤";
             
             // 🚨 ALERTA
             await sendWhatsApp(ADMIN_PHONE, `🚨 *INTERESSE EM SOLUÇÃO* 🚀\n\nCliente: *${phone}*\nQuer contratar uma solução da Nexlyr.\n\n👉 Link: https://wa.me/${phone}`);
        } else {
            reply = "Para contratar qualquer uma dessas soluções, digite *4* para falar com um consultor.\n\nOu digite *menu* para voltar.";
        }
    }

    // --- 3. DENTRO DE PLANOS ---
    else if (session === 'PLANOS') {
        if (textLower === "4") {
             await setSession(phone, 'HUMAN');
             reply = "Perfeito. Vamos montar uma proposta personalizada para você. Aguarde um momento. 👤";

             // 🚨 ALERTA
             await sendWhatsApp(ADMIN_PHONE, `🚨 *INTERESSE EM PLANOS* 💎\n\nCliente: *${phone}*\nQuer saber valores/proposta.\n\n👉 Link: https://wa.me/${phone}`);
        } else {
            reply = "Gostou dos planos? Digite *4* para receber uma proposta formal.\n\nOu digite *menu* para voltar.";
        }
    }

    // --- 4. DENTRO DE SUPORTE ---
    else if (session === 'SUPORTE') {
      if (['1', '2', '3'].includes(textLower)) {
        reply = "✅ Solicitação registrada! Nossa equipe técnica entrará em contato em breve.\n\nDigite *menu* para voltar.";
        await setSession(phone, 'MAIN');
      } else {
        reply = await askOpenAI("Cliente (SUPORTE): " + textOriginal);
      }
    }

    // ENVIO FINAL
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