"use strict";

const jwt = require("jsonwebtoken");
const config = require("../config");
const db = require("../database/connection");
const { lerPermissoesBanco, temPermissao, podeEnviarImagem } = require("../utils/permissoes");

function extrairUsuario(req, res) {
  const header = req.headers.authorization || "";
  const [, token] = header.split(" ");
  if (!token) {
    res.status(401).json({ erro: "Token de autenticação não fornecido." });
    return null;
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const registro = db.prepare("SELECT id, nome, email, papel, permissoes FROM administradores WHERE id = ?").get(payload.sub);
    if (!registro) {
      res.status(401).json({ erro: "Usuário não encontrado ou removido." });
      return null;
    }
    const ehAdminPrincipal = registro.papel === "admin" || String(registro.email).toLowerCase() === "admin@saquaremaverde.local";
    const papelEfetivo = ehAdminPrincipal ? "admin" : registro.papel;
    const usuario = {
      id: registro.id,
      sub: registro.id,
      nome: registro.nome,
      email: registro.email,
      papel: papelEfetivo,
      permissoes: lerPermissoesBanco({ ...registro, papel: papelEfetivo }),
    };
    req.usuario = usuario;
    return usuario;
  } catch {
    res.status(401).json({ erro: "Token inválido ou expirado." });
    return null;
  }
}

function autenticarUsuario(req, res, next) {
  const usuario = extrairUsuario(req, res);
  if (!usuario) return undefined;
  return next();
}

function autenticarAdmin(req, res, next) {
  const usuario = extrairUsuario(req, res);
  if (!usuario) return undefined;
  if (usuario.papel !== "admin") {
    return res.status(403).json({ erro: "Acesso restrito a administradores." });
  }
  return next();
}

function exigirPermissao(modulo, acao) {
  return (req, res, next) => {
    const usuario = extrairUsuario(req, res);
    if (!usuario) return undefined;
    if (!temPermissao(usuario, modulo, acao)) {
      return res.status(403).json({ erro: `Você não tem permissão para ${acao} em ${modulo}.` });
    }
    return next();
  };
}

function exigirPermissaoImagem(req, res, next) {
  const usuario = extrairUsuario(req, res);
  if (!usuario) return undefined;
  if (!podeEnviarImagem(usuario)) {
    return res.status(403).json({ erro: "Você não tem permissão para enviar imagens." });
  }
  return next();
}

module.exports = {
  autenticarUsuario,
  autenticarAdmin,
  exigirPermissao,
  exigirPermissaoImagem,
};
