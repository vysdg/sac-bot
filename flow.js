function menu() {
  return `Olá 👋
Sou o atendimento automático da *Empresa*.

Posso te ajudar agora mesmo 😊
Escolha uma opção:
1️⃣ Orçamento / Serviços
2️⃣ Suporte / Dúvidas
3️⃣ Financeiro
4️⃣ Falar com um atendente`
}

function suporteMenu() {
  return `📌 Suporte – dúvidas frequentes:
1️⃣ Horário de atendimento
2️⃣ Formas de pagamento
3️⃣ Prazos
0️⃣ Voltar ao menu`
}

function suporteResposta(opcao) {
  const respostas = {
    '1': '🕒 Nosso horário de atendimento é de segunda a sexta, das 9h às 18h.',
    '2': '💳 Aceitamos PIX, cartão de crédito e boleto.',
    '3': '⏱️ O prazo médio de atendimento é de até 24h úteis.'
  }

  return respostas[opcao] || 'Não entendi sua opção 😕'
}

module.exports = {
  menu,
  suporteMenu,
  suporteResposta
}
