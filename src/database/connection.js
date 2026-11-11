"use strict";

const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "..", "data", "saquarema.db");

if (dbPath !== ":memory:") {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function colunas(tabela) {
  return db.prepare(`PRAGMA table_info(${tabela})`).all().map((c) => c.name);
}

function tabelaExiste(tabela) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?").get(tabela));
}

function garantirColuna(tabela, coluna, ddl) {
  if (tabelaExiste(tabela) && !colunas(tabela).includes(coluna)) {
    db.exec(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${ddl}`);
  }
}

// Migracao do schema antigo (atracoes com dificuldade/duracao/distancia) para o novo.
// Faz backup do arquivo antes de alterar qualquer coisa.
function migrarAtracoesAntigas() {
  if (!tabelaExiste("atracoes") || !colunas("atracoes").includes("distancia")) return;

  if (dbPath !== ":memory:") {
    db.pragma("wal_checkpoint(TRUNCATE)");
    fs.copyFileSync(dbPath, `${dbPath}.bak`);
  }

  db.pragma("foreign_keys = OFF");
  db.transaction(() => {
    db.exec(`
      CREATE TABLE atracoes_nova (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        nome TEXT NOT NULL,
        categoria TEXT NOT NULL,
        descricao TEXT NOT NULL,
        localizacao TEXT NOT NULL DEFAULT 'Saquarema - RJ',
        condicao TEXT NOT NULL CHECK (condicao IN ('Aberta','Manutenção','Fechada')),
        horarios TEXT NOT NULL DEFAULT '08:00 às 17:00',
        regras_visitacao TEXT NOT NULL DEFAULT '',
        imagem_id INTEGER REFERENCES imagens(id) ON DELETE SET NULL,
        atualizado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );
      INSERT INTO atracoes_nova (id, slug, nome, categoria, descricao, condicao, horarios, atualizado_em)
        SELECT id, slug, nome, categoria, descricao, condicao, horarios, atualizado_em FROM atracoes;
      DROP TABLE atracoes;
      ALTER TABLE atracoes_nova RENAME TO atracoes;
    `);
  })();
  db.pragma("foreign_keys = ON");
}

db.exec(`
CREATE TABLE IF NOT EXISTS administradores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  papel TEXT NOT NULL DEFAULT 'admin',
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS imagens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mime TEXT NOT NULL,
  tamanho INTEGER NOT NULL,
  dados BLOB NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
`);

migrarAtracoesAntigas();

db.exec(`
CREATE TABLE IF NOT EXISTS atracoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  descricao TEXT NOT NULL,
  localizacao TEXT NOT NULL DEFAULT 'Saquarema - RJ',
  condicao TEXT NOT NULL CHECK (condicao IN ('Aberta','Manutenção','Fechada')),
  horarios TEXT NOT NULL DEFAULT '08:00 às 17:00',
  regras_visitacao TEXT NOT NULL DEFAULT '',
  imagem_id INTEGER REFERENCES imagens(id) ON DELETE SET NULL,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS biodiversidade (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  atracao_id INTEGER NOT NULL REFERENCES atracoes(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('Trilha','Cachoeira','Mirante','Fauna','Flora','Outro')),
  descricao TEXT NOT NULL,
  localizacao TEXT NOT NULL,
  distancia_km REAL,
  dificuldade TEXT CHECK (dificuldade IS NULL OR dificuldade IN ('Fácil','Moderada','Difícil')),
  duracao TEXT,
  recomendacoes TEXT NOT NULL DEFAULT '',
  dicas_seguranca TEXT NOT NULL DEFAULT '',
  funcionamento TEXT NOT NULL DEFAULT '',
  gratuito INTEGER NOT NULL DEFAULT 1,
  permanencia TEXT NOT NULL DEFAULT 'Permanente' CHECK (permanencia IN ('Permanente','Temporário')),
  condicao TEXT NOT NULL DEFAULT 'Aberta' CHECK (condicao IN ('Aberta','Manutenção','Fechada')),
  imagem_id INTEGER REFERENCES imagens(id) ON DELETE SET NULL,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  atracao_id INTEGER NOT NULL REFERENCES atracoes(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  data_hora TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  local TEXT NOT NULL DEFAULT '',
  data_fim TEXT,
  link TEXT,
  funcionamento TEXT NOT NULL DEFAULT '',
  gratuito INTEGER NOT NULL DEFAULT 1,
  permanencia TEXT NOT NULL DEFAULT 'Temporário',
  imagem_id INTEGER REFERENCES imagens(id) ON DELETE SET NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS relatos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  atracao_id INTEGER NOT NULL REFERENCES atracoes(id) ON DELETE CASCADE,
  biodiversidade_id INTEGER REFERENCES biodiversidade(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  texto TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS noticias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  resumo TEXT NOT NULL DEFAULT '',
  conteudo TEXT NOT NULL,
  imagem_id INTEGER REFERENCES imagens(id) ON DELETE SET NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS gastronomia (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Restaurante',
  descricao TEXT NOT NULL,
  endereco TEXT NOT NULL,
  funcionamento TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  imagem_id INTEGER REFERENCES imagens(id) ON DELETE SET NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
`);

// Bancos criados pelas versoes anteriores: acrescenta as colunas novas.
garantirColuna("administradores", "permissoes", "TEXT NOT NULL DEFAULT '{}'");
garantirColuna("eventos", "local", "TEXT NOT NULL DEFAULT ''");
garantirColuna("eventos", "data_fim", "TEXT");
garantirColuna("eventos", "link", "TEXT");
garantirColuna("eventos", "funcionamento", "TEXT NOT NULL DEFAULT ''");
garantirColuna("eventos", "gratuito", "INTEGER NOT NULL DEFAULT 1");
garantirColuna("eventos", "permanencia", "TEXT NOT NULL DEFAULT 'Temporário'");
garantirColuna("eventos", "imagem_id", "INTEGER REFERENCES imagens(id) ON DELETE SET NULL");
garantirColuna("relatos", "biodiversidade_id", "INTEGER REFERENCES biodiversidade(id) ON DELETE SET NULL");
garantirColuna("noticias", "resumo", "TEXT NOT NULL DEFAULT ''");
garantirColuna("noticias", "imagem_id", "INTEGER REFERENCES imagens(id) ON DELETE SET NULL");

db.exec(`
CREATE INDEX IF NOT EXISTS idx_eventos_atracao ON eventos(atracao_id);
CREATE INDEX IF NOT EXISTS idx_eventos_data ON eventos(data_hora);
CREATE INDEX IF NOT EXISTS idx_relatos_atracao ON relatos(atracao_id);
CREATE INDEX IF NOT EXISTS idx_relatos_criado ON relatos(criado_em);
CREATE INDEX IF NOT EXISTS idx_noticias_criado ON noticias(criado_em);
CREATE INDEX IF NOT EXISTS idx_bio_atracao ON biodiversidade(atracao_id, categoria);
`);

// Eventos antigos sem local passam a usar o nome da atracao.
db.exec(`
  UPDATE eventos SET local = (SELECT nome FROM atracoes WHERE atracoes.id = eventos.atracao_id)
  WHERE local = ''
`);

module.exports = db;
