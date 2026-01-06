// flow.js

export const promptSistema = `
Você é o assistente comercial da NEXLYR (@nexlyr.ai), uma agência de elite em Automação e Inteligência Artificial.
Sua meta é encantar clientes interessados em ter um bot igual a você.

SEUS SERVIÇOS:
1. Chatbots com IA (como você): Atendimento 24h, humanizado e inteligente.
2. Automação de Processos: Integração com sistemas, planilhas e CRMs.
3. Consultoria em IA: Implementação de ChatGPT corporativo.

REGRAS DE OURO:
- Dê respostas curtas e impactantes. Use emojis profissionais (🚀, 💡, 🤖).
- Se perguntarem preço, diga que temos planos a partir de R$ X (defina um valor base ou diga que é sob medida) e tente agendar uma demo.
- Se o cliente parecer confuso, sugira falar com um humano (Opção 4).
- Nunca quebre o personagem. Você é a tecnologia da Nexlyr em ação.
`;

export function menuPrincipal() {
  return (
    "👋 Olá! Bem-vindo à *Nexlyr AI*.\n" +
    "Sou um assistente inteligente, criado pela nossa equipe. 🤖\n\n" +
    "Como posso modernizar sua empresa hoje?\n" +
    "1️⃣ 🚀 Conhecer Soluções (Bots & IA)\n" +
    "2️⃣ 💎 Planos e Valores\n" +
    "3️⃣ 🛠️ Já sou Cliente (Suporte)\n" +
    "4️⃣ 👤 Falar com Especialista\n\n" +
    "Ou digite sua dúvida (ex: _'Vocês fazem bot para imobiliária?'_)"
  );
}

export function menuSolucoes() {
  return (
    "🚀 *Nossas Soluções de Alta Performance:*\n\n" +
    "*1. Atendimento Inteligente 24h*\n" +
    "Igual a mim! Responde dúvidas, filtra clientes e agenda reuniões.\n\n" +
    "*2. Recuperação de Vendas*\n" +
    "Bots ativos que chamam quem abandonou carrinho ou orçamento.\n\n" +
    "*3. Integrações (API)*\n" +
    "Conectamos o WhatsApp ao seu CRM, Planilhas ou Site.\n\n" +
    "Digite *menu* para voltar."
  );
}

export function menuPlanos() {
  return (
    "💎 *Investimento Inteligente*\n\n" +
    "Trabalhamos com projetos personalizados e planos mensais:\n\n" +
    "🔹 *Setup Inicial:* Criação e treinamento da IA.\n" +
    "🔹 *Mensalidade:* Manutenção e custos da API.\n\n" +
    "Quer um orçamento exato para seu negócio?\n" +
    "Digite *4* para falar com um consultor ou descreva o que precisa aqui."
  );
}

export function menuSuporte() {
  return (
    "🛠️ *Área do Cliente Nexlyr*\n\n" +
    "1️⃣ Reportar lentidão/queda\n" +
    "2️⃣ Solicitar alteração no fluxo\n" +
    "3️⃣ Segunda via de boleto\n" +
    "0️⃣ Voltar ao menu principal"
  );
}