"use strict";

const { executarSeed } = require("./database/seed");
const { criarApp } = require("./app");
const config = require("./config");

if (config.usaSecretPadrao) {
  if (config.producao) {
    console.error("[erro] JWT_SECRET é obrigatório em produção.");
    process.exit(1);
  }
  console.warn("[aviso] JWT_SECRET nao definido. Defina a variavel de ambiente em producao.");
}

executarSeed();

const app = criarApp();
const servidor = app.listen(config.porta, () => {
  console.log(`Saquarema Verde Online em http://localhost:${config.porta} (API em /api)`);
});

module.exports = servidor;
