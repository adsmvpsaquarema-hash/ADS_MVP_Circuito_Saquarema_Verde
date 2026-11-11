"use strict";

const db = require("../database/connection");
const { ErroValidacao } = require("../utils/validacao");

const MAX_BYTES = 2 * 1024 * 1024;

// Detecta o tipo real pelos primeiros bytes (nao confia no Content-Type).
function detectarMime(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

function criar(req, res) {
  const corpo = req.body;
  if (!Buffer.isBuffer(corpo) || corpo.length === 0) {
    throw new ErroValidacao(["Envie a imagem no corpo da requisição com Content-Type image/jpeg, image/png ou image/webp."]);
  }
  if (corpo.length > MAX_BYTES) throw new ErroValidacao(["A imagem deve ter no máximo 2 MB."]);
  const mime = detectarMime(corpo);
  if (!mime) throw new ErroValidacao(["Formato de imagem inválido. Use JPEG, PNG ou WebP."]);
  const info = db.prepare("INSERT INTO imagens (mime, tamanho, dados) VALUES (?, ?, ?)").run(mime, corpo.length, corpo);
  const id = Number(info.lastInsertRowid);
  return res.status(201).json({ id, url: `/api/imagens/${id}`, mime, tamanho: corpo.length });
}

function obter(req, res) {
  const imagem = db.prepare("SELECT mime, dados, tamanho FROM imagens WHERE id = ?").get(req.params.id);
  if (!imagem) return res.status(404).json({ erro: "Imagem não encontrada." });
  res.setHeader("Content-Type", imagem.mime);
  res.setHeader("Content-Length", imagem.tamanho);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  return res.send(imagem.dados);
}

function remover(req, res) {
  const info = db.prepare("DELETE FROM imagens WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ erro: "Imagem não encontrada." });
  return res.status(204).send();
}

module.exports = { criar, obter, remover, detectarMime, MAX_BYTES };
