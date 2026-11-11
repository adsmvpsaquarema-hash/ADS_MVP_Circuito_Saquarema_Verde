"use strict";

const db = require("../database/connection");
const { ErroValidacao, ErroNaoEncontrado, exigirCampos, validarTexto, paginacao } = require("../utils/validacao");

const SELECT_BASE = `
  SELECT r.id, r.nome, r.texto, r.criado_em, r.atracao_id, r.biodiversidade_id,
         a.nome AS atracao_nome, b.nome AS biodiversidade_nome
  FROM relatos r
  JOIN atracoes a ON a.id = r.atracao_id
  LEFT JOIN biodiversidade b ON b.id = r.biodiversidade_id
`;

function listar(req, res) {
  const { limite, pagina, offset } = paginacao(req.query, { limitePadrao: 20, limiteMax: 100 });
  const filtros = [];
  const params = {};
  if (req.query.atracao_id) { filtros.push("r.atracao_id = @atracao_id"); params.atracao_id = Number(req.query.atracao_id); }
  if (req.query.biodiversidade_id) { filtros.push("r.biodiversidade_id = @bio"); params.bio = Number(req.query.biodiversidade_id); }
  const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";
  const total = db.prepare(`SELECT COUNT(*) AS total FROM relatos r ${where}`).get(params).total;
  const linhas = db.prepare(`${SELECT_BASE} ${where} ORDER BY r.criado_em DESC, r.id DESC LIMIT @limite OFFSET @offset`)
    .all({ ...params, limite, offset });
  return res.json({ total, pagina, limite, relatos: linhas });
}

function criar(req, res) {
  exigirCampos(req.body, ["nome", "atracao_id", "texto"]);

  const erros = [];
  const coletar = (fn) => {
    try {
      return fn();
    } catch (error) {
      erros.push(...(error.mensagens || [error.message]));
      return null;
    }
  };

  const atracaoId = Number(req.body.atracao_id);
  if (!Number.isInteger(atracaoId) || atracaoId <= 0) {
    erros.push("atracao_id deve ser um número inteiro válido.");
  } else if (!db.prepare("SELECT id FROM atracoes WHERE id = ?").get(atracaoId)) {
    erros.push("atracao_id não corresponde a uma atração existente.");
  }

  let bioId = null;
  if (req.body.biodiversidade_id !== undefined && req.body.biodiversidade_id !== null && req.body.biodiversidade_id !== "") {
    bioId = Number(req.body.biodiversidade_id);
    const item = Number.isInteger(bioId) ? db.prepare("SELECT atracao_id FROM biodiversidade WHERE id = ?").get(bioId) : null;
    if (!item) erros.push("biodiversidade_id não corresponde a um item existente.");
    else if (item.atracao_id !== atracaoId) erros.push("biodiversidade_id não pertence à atração informada.");
  }

  const nome = coletar(() => validarTexto(req.body.nome, { campo: "nome", min: 2, max: 60 }));
  const texto = coletar(() => validarTexto(req.body.texto, { campo: "texto", min: 10, max: 500 }));

  if (erros.length > 0) throw new ErroValidacao(erros);

  const info = db.prepare(
    "INSERT INTO relatos (atracao_id, biodiversidade_id, nome, texto) VALUES (@atracao_id, @biodiversidade_id, @nome, @texto)"
  ).run({ atracao_id: atracaoId, biodiversidade_id: bioId, nome, texto });
  const criado = db.prepare(`${SELECT_BASE} WHERE r.id = ?`).get(info.lastInsertRowid);
  return res.status(201).json(criado);
}

// Moderacao: somente administradores removem relatos.
function remover(req, res) {
  if (!db.prepare("SELECT id FROM relatos WHERE id = ?").get(req.params.id)) {
    throw new ErroNaoEncontrado("Relato não encontrado.");
  }
  db.prepare("DELETE FROM relatos WHERE id = ?").run(req.params.id);
  return res.status(204).send();
}

module.exports = { listar, criar, remover };
