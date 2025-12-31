const sqlite3 = require('sqlite3').verbose()

const db = new sqlite3.Database('./db.sqlite')

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      phone TEXT PRIMARY KEY,
      state TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      need TEXT,
      contact TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
})

module.exports = db
