"use strict";

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../database/connection");
const config = require("../config");
const { exigirCampos, validarEmail, validarTexto } = require("../utils/validacao");
const { lerPermissoesBanco } = require("../utils/permissoes");
const { registrarFalhaLogin, limparTentativas } = require("../middlewares/rateLimiter");

function login(req, res) {
  const identificador = String(req.body.email ?? req.body.usuario ?? "").trim();
  const payload = { ...req.body, email: identificador };
  exigirCampos(payload, ["email", "senha"]);

  const emailConsulta = identificador.toLowerCase();
  const email = emailConsulta.includes("@")
    ? validarEmail(emailConsulta)
    : emailConsulta === "admin"
      ? "admin@saquaremaverde.local"
      : emailConsulta;
  const senha = validarTexto(req.body.senha, { campo: "senha", min: 6, max: 100 });

  const usuario = db.prepare(
    "SELECT * FROM administradores WHERE email = ? OR LOWER(nome) = ?"
  ).get(email, emailConsulta);

  if (!usuario || !bcrypt.compareSync(senha, usuario.senha_hash)) {
    registrarFalhaLogin(req.registroLogin.chave);
    return res.status(401).json({ erro: "E-mail ou senha incorretos." });
  }

  limparTentativas(req.registroLogin.chave);
  const permissoes = lerPermissoesBanco(usuario);
  const token = jwt.sign(
    { sub: usuario.id, nome: usuario.nome, papel: usuario.papel },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
  return res.json({
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      permissoes,
    },
  });
}

function eu(req, res) {
  return res.json({ usuario: req.usuario });
}

module.exports = { login, eu };
