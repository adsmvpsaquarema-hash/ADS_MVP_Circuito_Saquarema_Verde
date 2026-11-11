"use strict";

const db = require("../database/connection");
const { ErroNaoEncontrado, exigirCampos, validarTexto, validarImagemId, paginacao } = require("../utils/validacao");
const { comImagem, montarSet } = require("../utils/serializar");

function buscarPorId(id) {
  const noticia = db.prepare("SELECT * FROM noticias WHERE id = ?").get(id);
  if (!noticia) throw new ErroNaoEncontrado("Notícia não encontrada.");
  return comImagem(noticia);
}

function listar(req, res) {
  const { limite, pagina, offset } = paginacao(req.query, { limitePadrao: 10 });
  const total = db.prepare("SELECT COUNT(*) AS total FROM noticias").get().total;
  const linhas = db.prepare("SELECT * FROM noticias ORDER BY criado_em DESC, id DESC LIMIT ? OFFSET ?").all(limite, offset);
  return res.json({ total, pagina, limite, noticias: linhas.map(comImagem) });
}

function detalhar(req, res) {
  return res.json(buscarPorId(req.params.id));
}

// A imagem e obrigatoria: toda noticia publicada precisa de uma imagem ja enviada em /api/imagens.
function criar(req, res) {
  exigirCampos(req.body, ["titulo", "conteudo"]);
  const conteudo = validarTexto(req.body.conteudo, { campo: "conteudo", min: 10, max: 5000 });
  const dados = {
    titulo: validarTexto(req.body.titulo, { campo: "titulo", min: 5, max: 150 }),
    resumo: validarTexto(req.body.resumo || conteudo.slice(0, 140), { campo: "resumo", min: 0, max: 200 }),
    conteudo,
    imagem_id: validarImagemId(req.body.imagem_id, db, { obrigatoria: true }),
  };
  const info = db.prepare(
    "INSERT INTO noticias (titulo, resumo, conteudo, imagem_id) VALUES (@titulo, @resumo, @conteudo, @imagem_id)"
  ).run(dados);
  return res.status(201).json(buscarPorId(info.lastInsertRowid));
}

function atualizar(req, res) {
  buscarPorId(req.params.id);
  const b = req.body;
  const a = {};
  if (b.titulo !== undefined) a.titulo = validarTexto(b.titulo, { campo: "titulo", min: 5, max: 150 });
  if (b.resumo !== undefined) a.resumo = validarTexto(b.resumo, { campo: "resumo", min: 0, max: 200 });
  if (b.conteudo !== undefined) a.conteudo = validarTexto(b.conteudo, { campo: "conteudo", min: 10, max: 5000 });
  if (b.imagem_id !== undefined) a.imagem_id = validarImagemId(b.imagem_id, db, { obrigatoria: true });
  if (Object.keys(a).length === 0) return res.status(400).json({ erros: ["Nada para atualizar."] });
  db.prepare(`UPDATE noticias SET ${montarSet(a)} WHERE id = @id`).run({ ...a, id: req.params.id });
  return res.json(buscarPorId(req.params.id));
}

function remover(req, res) {
  buscarPorId(req.params.id);
  db.prepare("DELETE FROM noticias WHERE id = ?").run(req.params.id);
  return res.status(204).send();
}

module.exports = { listar, detalhar, criar, atualizar, remover };
