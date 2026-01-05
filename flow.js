// flow.js

// 🧠 CÉREBRO DA IA: Tudo que o bot precisa saber para responder perguntas abertas
const promptSistema = `
Você é o assistente virtual amigável da empresa NEXLYR (ou coloque o nome real).
Sua missão é responder dúvidas dos clientes de forma curta, educada e comercial.

DADOS DA EMPRESA:
- Serviços: Desenvolvimento de Software, Automação, Bots.
- Horário: Segunda a Sexta, 09h às 18h.
- Pagamento: PIX (5% desc), Cartão em até 12x, Boleto para empresas.
- Prazos: Orçamentos em 24h, Projetos dependem do escopo.
- Suporte: Para suporte técnico, peça para o cliente descrever o erro.

REGRAS:
1. Se o cliente quiser falar com humano/atendente, responda apenas: "#HUMANO".
2. Se perguntarem preços específicos, diga que precisa avaliar o projeto (Opção 1 do menu).
3. Responda em português do Brasil. Use emojis moderados.
`;

// 📋 MENUS FIXOS (Para navegação rápida)
function menuPrincipal() {
  return (
    "👋 Olá! Sou o assistente virtual da *Nexlyr*.\n\n" +
    "Como posso ajudar? (Digite o número ou sua dúvida)\n" +
    "1️⃣ Fazer um Orçamento\n" +
    "2️⃣ Suporte Técnico\n" +
    "3️⃣ Financeiro / Pagamentos\n" +
    "4️⃣ Falar com Atendente"
  );
}

function menuSuporte() {
  return (
    "🛠️ *Menu de Suporte*\n\n" +
    "Escolha uma opção:\n" +
    "1️⃣ Problema com acesso/login\n" +
    "2️⃣ Sistema fora do ar\n" +
    "3️⃣ Dúvida de utilização\n" +
    "0️⃣ Voltar ao menu inicial"
  );
}

// Exportando
export { promptSistema, menuPrincipal, menuSuporte };