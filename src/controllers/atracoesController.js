"use strict";

const db = require("../database/connection");
const {
  ErroNaoEncontrado, exigirCampos, validarTexto, validarCondicao, validarImagemId,
} = require("../utils/validacao");
const { comImagem, montarSet } = require("../utils/serializar");

function buscarPorId(id) {
  const atracao = db.prepare("SELECT * FROM atracoes WHERE id = ?").get(id);
  if (!atracao) throw new ErroNaoEncontrado("Atração não encontrada.");
  return comImagem(atracao);
}

function listar(req, res) {
  const termo = String(req.query.q ?? "").trim();
  let linhas;
  if (termo) {
    const like = `%${termo}%`;
    linhas = db.prepare(`
      SELECT * FROM atracoes WHERE nome LIKE ? OR categoria LIKE ? OR descricao LIKE ? ORDER BY nome
    `).all(like, like, like);
  } else {
    linhas = db.prepare("SELECT * FROM atracoes ORDER BY nome").all();
  }
  return res.json({ total: linhas.length, atracoes: linhas.map(comImagem) });
}

// Detalhe com as subdivisoes da atracao: biodiversidade e eventos (alem dos relatos recentes).
function detalhar(req, res) {
  const atracao = buscarPorId(req.params.id);
  const biodiversidade = db.prepare(
    "SELECT b.*, ? AS atracao_nome FROM biodiversidade b WHERE b.atracao_id = ? ORDER BY b.categoria, b.nome"
  ).all(atracao.nome, atracao.id).map(comImagem);
  const eventos = db.prepare(
    "SELECT e.*, ? AS atracao_nome FROM eventos e WHERE e.atracao_id = ? ORDER BY e.data_hora"
  ).all(atracao.nome, atracao.id).map(comImagem);
  const relatos = db.prepare(
    "SELECT id, nome, texto, criado_em FROM relatos WHERE atracao_id = ? ORDER BY criado_em DESC LIMIT 10"
  ).all(atracao.id);
  return res.json({ ...atracao, biodiversidade, eventos, relatos });
}

function dadosCompletos(body) {
  return {
    slug: validarTexto(body.slug, { campo: "slug", min: 2, max: 80 }).toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
    nome: validarTexto(body.nome, { campo: "nome", min: 3, max: 120 }),
    categoria: validarTexto(body.categoria, { campo: "categoria", min: 2, max: 40 }),
    descricao: validarTexto(body.descricao, { campo: "descricao", min: 10, max: 1000 }),
    localizacao: validarTexto(body.localizacao || "Saquarema - RJ", { campo: "localizacao", min: 3, max: 150 }),
    condicao: validarCondicao(body.condicao || "Aberta"),
    horarios: validarTexto(body.horarios || "08:00 às 17:00", { campo: "horarios", min: 3, max: 120 }),
    regras_visitacao: validarTexto(body.regras_visitacao || "", { campo: "regras_visitacao", min: 0, max: 1500 }),
    imagem_id: validarImagemId(body.imagem_id, db),
  };
}

function criar(req, res) {
  exigirCampos(req.body, ["slug", "nome", "categoria", "descricao"]);
  const dados = dadosCompletos(req.body);
  try {
    const info = db.prepare(`
      INSERT INTO atracoes (slug, nome, categoria, descricao, localizacao, condicao, horarios, regras_visitacao, imagem_id)
      VALUES (@slug, @nome, @categoria, @descricao, @localizacao, @condicao, @horarios, @regras_visitacao, @imagem_id)
    `).run(dados);
    return res.status(201).json(buscarPorId(info.lastInsertRowid));
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ erro: "Já existe atração com esse slug." });
    }
    throw err;
  }
}

// Gestao de disponibilidade: administradores atualizam condicao, horarios, descricao e regras.
function atualizar(req, res) {
  buscarPorId(req.params.id);
  const b = req.body;
  const atualizacoes = {};
  if (b.nome !== undefined) atualizacoes.nome = validarTexto(b.nome, { campo: "nome", min: 3, max: 120 });
  if (b.categoria !== undefined) atualizacoes.categoria = validarTexto(b.categoria, { campo: "categoria", min: 2, max: 40 });
  if (b.localizacao !== undefined) atualizacoes.localizacao = validarTexto(b.localizacao, { campo: "localizacao", min: 3, max: 150 });
  if (b.condicao !== undefined) atualizacoes.condicao = validarCondicao(b.condicao);
  if (b.horarios !== undefined) atualizacoes.horarios = validarTexto(b.horarios, { campo: "horarios", min: 3, max: 120 });
  if (b.descricao !== undefined) atualizacoes.descricao = validarTexto(b.descricao, { campo: "descricao", min: 10, max: 1000 });
  if (b.regras_visitacao !== undefined) atualizacoes.regras_visitacao = validarTexto(b.regras_visitacao, { campo: "regras_visitacao", min: 0, max: 1500 });
  if (b.imagem_id !== undefined) atualizacoes.imagem_id = validarImagemId(b.imagem_id, db);
  if (Object.keys(atualizacoes).length === 0) {
    return res.status(400).json({ erros: ["Nada para atualizar."] });
  }
  db.prepare(`UPDATE atracoes SET ${montarSet(atualizacoes)}, atualizado_em = datetime('now','localtime') WHERE id = @id`)
    .run({ ...atualizacoes, id: req.params.id });
  return res.json(buscarPorId(req.params.id));
}

function remover(req, res) {
  buscarPorId(req.params.id);
  db.prepare("DELETE FROM atracoes WHERE id = ?").run(req.params.id);
  return res.status(204).send();
}

module.exports = { listar, detalhar, criar, atualizar, remover };
