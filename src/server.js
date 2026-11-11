"use strict";

const { executarSeed } = require("./database/seed");
const { criarApp } = require("./app");
const config = require("./config");

executarSeed();

const app = criarApp();
const servidor = app.listen(config.porta, "0.0.0.0", () => {
  console.log(`Saquarema Verde Online escutando na porta ${config.porta} (API em /api)`);
});

module.exports = servidor;
