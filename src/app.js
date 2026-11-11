"use strict";

const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const routes = require("./routes");
const config = require("./config");
const { notFound, errorHandler } = require("./middlewares/errorHandler");

function criarApp() {
  const app = express();
  const publico = path.join(__dirname, "..", "public");

  app.disable("x-powered-by");
  app.use(helmet({
    contentSecurityPolicy: {
      directives: { ...helmet.contentSecurityPolicy.getDefaultDirectives(), "img-src": ["'self'", "data:", "blob:"] },
    },
  }));
  app.use(compression());
  app.use(express.json({ limit: "100kb" }));

  // CORS restrito: o front e servido pela mesma origem. Outra origem so com CORS_ORIGIN.
  app.use((req, res, next) => {
    if (config.origemPermitida && req.headers.origin === config.origemPermitida) {
      res.setHeader("Access-Control-Allow-Origin", config.origemPermitida);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    return next();
  });

  app.use("/api", routes);
  app.use("/api", notFound);

  app.use(express.static(publico, { extensions: ["html"], maxAge: "5m" }));
  app.get("/", (req, res) => res.sendFile(path.join(publico, "index.html")));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { criarApp };
