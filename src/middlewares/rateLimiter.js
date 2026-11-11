"use strict";

// Limitador simples em memoria para o login (anti forca-bruta).
const tentativas = new Map(); // chave -> { count, resetEm }
const JANELA_MS = 10 * 60 * 1000; // 10 minutos
const MAX_TENTATIVAS = 5;

function limitarTentativasLogin(req, res, next) {
  const chave = `${req.ip}|${(req.body?.email || "").toLowerCase()}`;
  const agora = Date.now();
  const registro = tentativas.get(chave);

  if (registro && agora > registro.resetEm) tentativas.delete(chave);
  const atual = tentativas.get(chave);

  if (atual && atual.count >= MAX_TENTATIVAS) {
    const segundos = Math.ceil((atual.resetEm - agora) / 1000);
    return res.status(429).json({ erro: `Muitas tentativas. Tente novamente em ${segundos}s.` });
  }
  req.registroLogin = { chave };
  return next();
}

function registrarFalhaLogin(chave) {
  const agora = Date.now();
  const atual = tentativas.get(chave);
  if (!atual || agora > atual.resetEm) {
    tentativas.set(chave, { count: 1, resetEm: agora + JANELA_MS });
  } else {
    atual.count += 1;
  }
}

function limparTentativas(chave) {
  tentativas.delete(chave);
}

// Limitador generico por IP (usado em rotas publicas de escrita).
function criarLimitador({ janelaMs, max, mensagem }) {
  const registros = new Map();
  return (req, res, next) => {
    if (process.env.RATE_LIMIT_DESATIVADO === "1") return next();
    const agora = Date.now();
    const atual = registros.get(req.ip);
    if (!atual || agora > atual.resetEm) {
      registros.set(req.ip, { count: 1, resetEm: agora + janelaMs });
      return next();
    }
    atual.count += 1;
    if (atual.count > max) {
      return res.status(429).json({ erro: mensagem });
    }
    return next();
  };
}

module.exports = { limitarTentativasLogin, registrarFalhaLogin, limparTentativas, criarLimitador };
