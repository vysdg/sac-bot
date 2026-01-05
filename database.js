// database.js
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Nome do arquivo do banco de dados
const DB_FILE = './sac_dados.sqlite';

// Função para abrir conexão
async function getDb() {
  return open({
    filename: DB_FILE,
    driver: sqlite3.Database
  });
}

// Inicializa as tabelas (Roda ao iniciar o server)
export async function initDb() {
  const db = await getDb();
  
  // Tabela de Sessão (Onde o usuário está)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      phone TEXT PRIMARY KEY,
      step TEXT DEFAULT 'MAIN',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Tabela de Histórico (Conversa completa)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT,
      role TEXT, -- 'user' ou 'assistant'
      content TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("📂 Banco de dados conectado e tabelas verificadas.");
  await db.close();
}

// ==========================================
// FUNÇÕES DE SESSÃO (Estado do Usuário)
// ==========================================

export async function getSession(phone) {
  const db = await getDb();
  const result = await db.get('SELECT step FROM sessions WHERE phone = ?', [phone]);
  await db.close();
  return result ? result.step : 'MAIN';
}

export async function setSession(phone, step) {
  const db = await getDb();
  // Insere ou Atualiza (Upsert simplificado)
  const exists = await db.get('SELECT phone FROM sessions WHERE phone = ?', [phone]);
  
  if (exists) {
    await db.run('UPDATE sessions SET step = ?, updated_at = CURRENT_TIMESTAMP WHERE phone = ?', [step, phone]);
  } else {
    await db.run('INSERT INTO sessions (phone, step) VALUES (?, ?)', [phone, step]);
  }
  await db.close();
}

// ==========================================
// FUNÇÕES DE HISTÓRICO (Salvar Conversa)
// ==========================================

export async function saveHistory(phone, role, content) {
  const db = await getDb();
  await db.run(
    'INSERT INTO history (phone, role, content) VALUES (?, ?, ?)',
    [phone, role, content]
  );
  await db.close();
}