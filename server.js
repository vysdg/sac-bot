const express = require('express')
const bodyParser = require('body-parser')

const db = require('./database.js')
const flows = require('./flows.js')

const app = express()
app.use(bodyParser.json())

app.post('/webhook', (req, res) => {
  const { phone, message } = req.body

  if (!phone || !message) {
    return res.json({ reply: 'Mensagem inválida.' })
  }

  db.get(
    'SELECT * FROM users WHERE phone = ?',
    [phone],
    (err, user) => {
      if (!user) {
        db.run(
          'INSERT INTO users (phone, state) VALUES (?, ?)',
          [phone, 'MENU']
        )
        return res.json({ reply: flows.menu() })
      }

      switch (user.state) {
        case 'MENU':
          return handleMenu(phone, message, res)

        case 'ORCAMENTO_NOME':
          saveState(phone, 'ORCAMENTO_NECESSIDADE')
          return res.json({ reply: 'Qual serviço você procura?' })

        case 'ORCAMENTO_NECESSIDADE':
          saveState(phone, 'ORCAMENTO_CONTATO')
          return res.json({ reply: 'Qual seu telefone ou e-mail?' })

        case 'ORCAMENTO_CONTATO':
          db.run(
            'INSERT INTO leads (name, need, contact) VALUES (?, ?, ?)',
            ['Lead', 'Orçamento', message]
          )
          saveState(phone, 'MENU')
          return res.json({
            reply:
              'Perfeito! Seu pedido foi registrado. Um atendente entrará em contato.'
          })

        case 'SUPORTE':
          if (message === '0') {
            saveState(phone, 'MENU')
            return res.json({ reply: flows.menu() })
          }

          const resposta = flows.suporteResposta(message)
          return res.json({
            reply: resposta + '\n\nDigite 0️⃣ para voltar ao menu.'
          })

        default:
          saveState(phone, 'MENU')
          return res.json({ reply: flows.menu() })
      }
    }
  )
})

function handleMenu(phone, message, res) {
  if (message === '1') {
    saveState(phone, 'ORCAMENTO_NOME')
    return res.json({ reply: 'Qual seu nome?' })
  }

  if (message === '2') {
    saveState(phone, 'SUPORTE')
    return res.json({ reply: flows.suporteMenu() })
  }

  if (message === '3') {
    return res.json({
      reply:
        '💰 Financeiro:\nAceitamos PIX, cartão e boleto.\nHorário: 9h às 18h.'
    })
  }

  if (message === '4') {
    saveState(phone, 'HUMANO')
    return res.json({
      reply: 'Certo! Um atendente vai falar com você em breve.'
    })
  }

  return res.json({ reply: flows.menu() })
}

function saveState(phone, state) {
  db.run('UPDATE users SET state = ? WHERE phone = ?', [state, phone])
}

/* 🚨 AJUSTE CRÍTICO PARA RAILWAY */
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`🤖 SAC rodando na porta ${PORT}`)
})
