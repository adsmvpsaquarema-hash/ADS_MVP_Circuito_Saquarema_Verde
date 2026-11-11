"use strict";

// Testa a migracao do schema antigo (atracoes com dificuldade/duracao/distancia) para o novo.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "saquarema-mig-"));
const dbFile = path.join(dir, "antigo.db");

// Cria o banco no formato antigo
const antigo = new Database(dbFile);
antigo.exec(`
CREATE TABLE administradores (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL, papel TEXT NOT NULL DEFAULT 'admin', criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')));
CREATE TABLE atracoes (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, nome TEXT NOT NULL, categoria TEXT NOT NULL,
  descricao TEXT NOT NULL, dificuldade TEXT NOT NULL, duracao TEXT NOT NULL, distancia TEXT NOT NULL,
  condicao TEXT NOT NULL CHECK (condicao IN ('Aberta','Manutenção','Fechada')), horarios TEXT NOT NULL DEFAULT '08:00 às 17:00',
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')));
CREATE TABLE eventos (id INTEGER PRIMARY KEY AUTOINCREMENT, atracao_id INTEGER NOT NULL REFERENCES atracoes(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL, data_hora TEXT NOT NULL, descricao TEXT NOT NULL DEFAULT '', criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')));
CREATE TABLE relatos (id INTEGER PRIMARY KEY AUTOINCREMENT, atracao_id INTEGER NOT NULL REFERENCES atracoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL, texto TEXT NOT NULL, criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')));
CREATE TABLE noticias (id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT NOT NULL, conteudo TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')));
INSERT INTO atracoes (slug, nome, categoria, descricao, dificuldade, duracao, distancia, condicao)
  VALUES ('costa-do-sol', 'Parque Estadual da Costa do Sol', 'Trilha', 'Trilhas costeiras com mirantes.', 'Moderada', '2h30', '4,5 km', 'Aberta');
INSERT INTO eventos (atracao_id, titulo, data_hora) VALUES (1, 'Observação de aves', '2026-11-14 07:00');
INSERT INTO relatos (atracao_id, nome, texto) VALUES (1, 'Mariana', 'Trilha incrível, vale cada passo!');
INSERT INTO noticias (titulo, conteudo) VALUES ('Notícia antiga', 'Conteúdo da notícia antiga sem imagem.');
`);
antigo.close();

process.env.DB_PATH = dbFile;
process.env.JWT_SECRET = "segredo-de-teste";

test("migra o schema antigo preservando dados, com backup", () => {
  const db = require("../src/database/connection");
  const { executarSeed } = require("../src/database/seed");
  executarSeed();
  executarSeed(); // idempotente

  assert.ok(fs.existsSync(`${dbFile}.bak`), "backup deve existir");
  const cols = db.prepare("PRAGMA table_info(atracoes)").all().map((c) => c.name);
  assert.ok(!cols.includes("distancia"));
  assert.ok(cols.includes("regras_visitacao"));

  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM relatos WHERE nome = 'Mariana'").get().n, 1);
  const evento = db.prepare("SELECT * FROM eventos WHERE titulo = 'Observação de aves'").get();
  assert.equal(evento.local, "Parque Estadual da Costa do Sol");

  const antiga = db.prepare("SELECT * FROM noticias WHERE titulo = 'Notícia antiga'").get();
  assert.ok(antiga.imagem_id, "notícia antiga recebe imagem padrão");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM noticias WHERE imagem_id IS NULL").get().n, 0);
  assert.ok(db.prepare("SELECT COUNT(*) AS n FROM biodiversidade").get().n >= 3);
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
  db.close();
});
