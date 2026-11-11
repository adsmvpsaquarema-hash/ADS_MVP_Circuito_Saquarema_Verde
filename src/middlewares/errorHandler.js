"use strict";

function notFound(req, res) {
  res.status(404).json({ erro: "Rota não encontrada." });
}

// Tratador central de erros: erros de validacao sao 400, o resto 500.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ erro: "JSON malformado no corpo da requisição." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ erro: "Corpo da requisição grande demais (imagens: máximo 2 MB)." });
  }
  if (err.status && err.mensagens) {
    return res.status(err.status).json({ erros: err.mensagens });
  }
  if (err.status) {
    return res.status(err.status).json({ erro: err.message });
  }
  console.error("[erro]", err);
  return res.status(500).json({ erro: "Erro interno do servidor." });
}

module.exports = { notFound, errorHandler };
