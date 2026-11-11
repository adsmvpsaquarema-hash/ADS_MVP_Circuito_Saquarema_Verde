"use strict";

// Validacoes simples e reutilizaveis. Lanca erro com status para o tratador central.

class ErroValidacao extends Error {
  constructor(mensagens) {
    super("Dados inválidos.");
    this.status = 400;
    this.mensagens = mensagens;
  }
}

const CONDICOES = ["Aberta", "Manutenção", "Fechada"];

function exigirCampos(corpo, campos) {
  const faltantes = campos.filter((c) => corpo[c] === undefined || corpo[c] === null || String(corpo[c]).trim() === "");
  if (faltantes.length > 0) {
    throw new ErroValidacao(faltantes.map((c) => `Campo obrigatório ausente: ${c}.`));
  }
}

function validarTexto(valor, { campo, min = 1, max = 255 }) {
  const v = String(valor ?? "").trim();
  if (v.length < min) throw new ErroValidacao([`${campo} deve ter no mínimo ${min} caracteres.`]);
  if (v.length > max) throw new ErroValidacao([`${campo} deve ter no máximo ${max} caracteres.`]);
  return v;
}

function validarEmail(email) {
  const v = String(email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new ErroValidacao(["E-mail inválido."]);
  return v;
}

function validarCondicao(condicao) {
  if (!CONDICOES.includes(condicao)) {
    throw new ErroValidacao([`Condição deve ser uma de: ${CONDICOES.join(", ")}.`]);
  }
  return condicao;
}

function validarDataHora(valor, campo = "data_hora") {
  const v = String(valor ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/.test(v)) {
    throw new ErroValidacao([`${campo} deve estar no formato AAAA-MM-DD ou AAAA-MM-DD HH:MM.`]);
  }
  return v;
}

class ErroNaoEncontrado extends Error {
  constructor(msg) { super(msg); this.status = 404; }
}

function validarEnum(valor, opcoes, campo) {
  if (!opcoes.includes(valor)) {
    throw new ErroValidacao([`${campo} deve ser uma de: ${opcoes.join(", ")}.`]);
  }
  return valor;
}

function validarNumeroOpcional(valor, campo, { min = 0, max = 10000 } = {}) {
  if (valor === undefined || valor === null || String(valor).trim() === "") return null;
  const n = Number(String(valor).replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new ErroValidacao([`${campo} deve ser um número entre ${min} e ${max}.`]);
  }
  return n;
}

function validarUrlOpcional(valor, campo = "link") {
  const v = String(valor ?? "").trim();
  if (!v) return null;
  if (!/^https?:\/\/[^\s]+$/i.test(v) || v.length > 300) {
    throw new ErroValidacao([`${campo} deve ser uma URL http(s) válida.`]);
  }
  return v;
}

function validarBooleano(valor, padrao = 1) {
  if (valor === undefined || valor === null || valor === "") return padrao;
  if (valor === true || valor === 1 || valor === "1" || valor === "true") return 1;
  if (valor === false || valor === 0 || valor === "0" || valor === "false") return 0;
  throw new ErroValidacao(["Valor booleano inválido."]);
}

// Exige que a imagem exista na tabela imagens (retorna o id numerico).
function validarImagemId(valor, db, { obrigatoria = false, campo = "imagem_id" } = {}) {
  if (valor === undefined || valor === null || valor === "") {
    if (obrigatoria) throw new ErroValidacao([`${campo} é obrigatório: envie uma imagem.`]);
    return null;
  }
  const id = Number(valor);
  if (!Number.isInteger(id) || !db.prepare("SELECT 1 FROM imagens WHERE id = ?").get(id)) {
    throw new ErroValidacao([`${campo} não corresponde a uma imagem existente.`]);
  }
  return id;
}

function paginacao(query, { limitePadrao = 20, limiteMax = 50 } = {}) {
  const limite = Math.min(Math.max(Number(query.limite) || limitePadrao, 1), limiteMax);
  const pagina = Math.max(Number(query.pagina) || 1, 1);
  return { limite, pagina, offset: (pagina - 1) * limite };
}

module.exports = {
  ErroValidacao, ErroNaoEncontrado, exigirCampos, validarTexto, validarEmail, validarCondicao, validarDataHora,
  validarEnum, validarNumeroOpcional, validarUrlOpcional, validarBooleano, validarImagemId, paginacao,
};