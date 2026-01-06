import "dotenv/config";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function teste() {
  console.log("🤖 Testando conexão com OpenAI...");
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Diga 'Oi' se estiver funcionando." }],
    });
    console.log("✅ SUCESSO:", response.choices[0].message.content);
  } catch (error) {
    console.error("❌ ERRO DETALHADO:", error.status, error.code, error.type);
    console.error("Mensagem:", error.message); // Aqui vai aparecer o motivo real
  }
}

teste();