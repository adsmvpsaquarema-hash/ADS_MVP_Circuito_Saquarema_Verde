"use strict";

const express = require("express");
const auth = require("../controllers/authController");
const usuarios = require("../controllers/usuariosController");
const atracoes = require("../controllers/atracoesController");
const biodiversidade = require("../controllers/biodiversidadeController");
const eventos = require("../controllers/eventosController");
const relatos = require("../controllers/relatosController");
const noticias = require("../controllers/noticiasController");
const gastronomia = require("../controllers/gastronomiaController");
const imagens = require("../controllers/imagensController");
const {
  autenticarUsuario,
  exigirPermissao,
  exigirPermissaoImagem,
} = require("../middlewares/auth");
const { limitarTentativasLogin, criarLimitador } = require("../middlewares/rateLimiter");

const router = express.Router();

// Leituras publicas: revalida no servidor com ETag para refletir mudancas do admin imediatamente.
const cachePublico = () => (req, res, next) => {
  if (req.method === "GET") res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  next();
};

const limitarRelatos = criarLimitador({ janelaMs: 10 * 60 * 1000, max: 10, mensagem: "Muitos relatos enviados. Tente novamente mais tarde." });
const apenasImagem = express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: imagens.MAX_BYTES });

router.get("/saude", (req, res) => res.json({ status: "ok" }));

// Autenticacao
router.post("/auth/login", limitarTentativasLogin, auth.login);
router.get("/auth/eu", autenticarUsuario, auth.eu);

// Gestao de usuarios e permissoes
router.get("/usuarios", exigirPermissao("usuarios", "ler"), usuarios.listar);
router.get("/usuarios/:id", exigirPermissao("usuarios", "ler"), usuarios.detalhar);
router.post("/usuarios", exigirPermissao("usuarios", "criar"), usuarios.criar);
router.put("/usuarios/:id", exigirPermissao("usuarios", "editar"), usuarios.atualizar);
router.delete("/usuarios/:id", exigirPermissao("usuarios", "excluir"), usuarios.remover);

// Imagens (leitura publica / escrita restrita a usuarios com permissao de criacao/edicao)
router.get("/imagens/:id", imagens.obter);
router.post("/imagens", exigirPermissaoImagem, apenasImagem, imagens.criar);
router.delete("/imagens/:id", exigirPermissaoImagem, imagens.remover);

// Atracoes (leitura publica / escrita restrita). Subdivisoes: biodiversidade e eventos.
router.get("/atracoes", cachePublico(30), atracoes.listar);
router.get("/atracoes/:id", cachePublico(30), atracoes.detalhar);
router.post("/atracoes", exigirPermissao("atracoes", "criar"), atracoes.criar);
router.put("/atracoes/:id", exigirPermissao("atracoes", "editar"), atracoes.atualizar);
router.delete("/atracoes/:id", exigirPermissao("atracoes", "excluir"), atracoes.remover);

// Biodiversidade (trilhas, cachoeiras, mirantes, fauna, flora...)
router.get("/biodiversidade", cachePublico(30), biodiversidade.listar);
router.get("/biodiversidade/:id", cachePublico(30), biodiversidade.detalhar);
router.post("/biodiversidade", exigirPermissao("biodiversidade", "criar"), biodiversidade.criar);
router.put("/biodiversidade/:id", exigirPermissao("biodiversidade", "editar"), biodiversidade.atualizar);
router.delete("/biodiversidade/:id", exigirPermissao("biodiversidade", "excluir"), biodiversidade.remover);

// Eventos
router.get("/eventos", cachePublico(30), eventos.listar);
router.get("/eventos/:id", cachePublico(30), eventos.detalhar);
router.post("/eventos", exigirPermissao("eventos", "criar"), eventos.criar);
router.put("/eventos/:id", exigirPermissao("eventos", "editar"), eventos.atualizar);
router.delete("/eventos/:id", exigirPermissao("eventos", "excluir"), eventos.remover);

// Gastronomia
router.get("/gastronomia", cachePublico(30), gastronomia.listar);
router.get("/gastronomia/:id", cachePublico(30), gastronomia.detalhar);
router.post("/gastronomia", exigirPermissao("gastronomia", "criar"), gastronomia.criar);
router.put("/gastronomia/:id", exigirPermissao("gastronomia", "editar"), gastronomia.atualizar);
router.delete("/gastronomia/:id", exigirPermissao("gastronomia", "excluir"), gastronomia.remover);

// Relatos da comunidade (publicos para ler e enviar; remocao restrita)
router.get("/relatos", relatos.listar);
router.post("/relatos", limitarRelatos, relatos.criar);
router.delete("/relatos/:id", exigirPermissao("relatos", "excluir"), relatos.remover);

// Noticias (pagina inicial)
router.get("/noticias", cachePublico(15), noticias.listar);
router.get("/noticias/:id", cachePublico(15), noticias.detalhar);
router.post("/noticias", exigirPermissao("noticias", "criar"), noticias.criar);
router.put("/noticias/:id", exigirPermissao("noticias", "editar"), noticias.atualizar);
router.delete("/noticias/:id", exigirPermissao("noticias", "excluir"), noticias.remover);

module.exports = router;
