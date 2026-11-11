"use strict";

const db = require("../database/connection");
const { ErroNaoEncontrado, exigirCampos, validarTexto, validarImagemId, paginacao } = require("../utils/validacao");
const { comImagem, montarSet } = require("../utils/serializar");

function buscarPorId(id) {
  const item = db.prepare("SELECT * FROM gastronomia WHERE id = ?").get(id);
  if (!item) throw new ErroNaoEncontrado("Item de gastronomia não encontrado.");
  return comImagem(item);
}

function listar(req, res) {
  const { limite, pagina, offset } = paginacao(req.query);
  const total = db.prepare("SELECT COUNT(*) AS total FROM gastronomia").get().total;
  const linhas = db.prepare("SELECT * FROM gastronomia ORDER BY nome LIMIT ? OFFSET ?").all(limite, offset);
  return res.json({ total, pagina, limite, gastronomia: linhas.map(comImagem) });
}

function detalhar(req, res) {
  return res.json(buscarPorId(req.params.id));
}

function criar(req, res) {
  const b = req.body;
  exigirCampos(b, ["nome", "descricao", "endereco"]);
  const dados = {
    nome: validarTexto(b.nome, { campo: "nome", min: 3, max: 120 }),
    tipo: validarTexto(b.tipo || "Restaurante", { campo: "tipo", min: 3, max: 40 }),
    descricao: validarTexto(b.descricao, { campo: "descricao", min: 5, max: 1000 }),
    endereco: validarTexto(b.endereco, { campo: "endereco", min: 5, max: 200 }),
    funcionamento: validarTexto(b.funcionamento || "", { campo: "funcionamento", min: 0, max: 200 }),
    telefone: validarTexto(b.telefone || "", { campo: "telefone", min: 0, max: 30 }),
    imagem_id: validarImagemId(b.imagem_id, db),
  };
  const info = db.prepare(`
    INSERT INTO gastronomia (nome, tipo, descricao, endereco, funcionamento, telefone, imagem_id)
    VALUES (@nome, @tipo, @descricao, @endereco, @funcionamento, @telefone, @imagem_id)
  `).run(dados);
  return res.status(201).json(buscarPorId(info.lastInsertRowid));
}

function atualizar(req, res) {
  buscarPorId(req.params.id);
  const b = req.body;
  const a = {};
  if (b.nome !== undefined) a.nome = validarTexto(b.nome, { campo: "nome", min: 3, max: 120 });
  if (b.tipo !== undefined) a.tipo = validarTexto(b.tipo, { campo: "tipo", min: 3, max: 40 });
  if (b.descricao !== undefined) a.descricao = validarTexto(b.descricao, { campo: "descricao", min: 5, max: 1000 });
  if (b.endereco !== undefined) a.endereco = validarTexto(b.endereco, { campo: "endereco", min: 5, max: 200 });
  if (b.funcionamento !== undefined) a.funcionamento = validarTexto(b.funcionamento, { campo: "funcionamento", min: 0, max: 200 });
  if (b.telefone !== undefined) a.telefone = validarTexto(b.telefone, { campo: "telefone", min: 0, max: 30 });
  if (b.imagem_id !== undefined) a.imagem_id = validarImagemId(b.imagem_id, db);
  if (Object.keys(a).length === 0) return res.status(400).json({ erros: ["Nada para atualizar."] });
  db.prepare(`UPDATE gastronomia SET ${montarSet(a)} WHERE id = @id`).run({ ...a, id: req.params.id });
  return res.json(buscarPorId(req.params.id));
}

function remover(req, res) {
  buscarPorId(req.params.id);
  db.prepare("DELETE FROM gastronomia WHERE id = ?").run(req.params.id);
  return res.status(204).send();
}

module.exports = { listar, detalhar, criar, atualizar, remover };
