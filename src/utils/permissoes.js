"use strict";

const { ErroValidacao } = require("./validacao");

const MODULOS_SISTEMA = [
  "noticias",
  "biodiversidade",
  "eventos",
  "atracoes",
  "gastronomia",
  "relatos",
  "usuarios",
];

const ACOES = ["ler", "criar", "editar", "excluir"];
const PAPEIS = ["admin", "gestor", "colaborador", "personalizado"];

function matriz(valor) {
  return { ler: Boolean(valor.ler), criar: Boolean(valor.criar), editar: Boolean(valor.editar), excluir: Boolean(valor.excluir) };
}

const TUDO = { ler: true, criar: true, editar: true, excluir: true };
const LER_CRIAR_EDITAR = { ler: true, criar: true, editar: true, excluir: false };
const APENAS_LER = { ler: true, criar: false, editar: false, excluir: false };
const NADA = { ler: false, criar: false, editar: false, excluir: false };

const PERFIS_PADRAO = {
  admin: {
    noticias: { ...TUDO },
    biodiversidade: { ...TUDO },
    eventos: { ...TUDO },
    atracoes: { ...TUDO },
    gastronomia: { ...TUDO },
    relatos: { ler: true, criar: false, editar: false, excluir: true },
    usuarios: { ...TUDO },
  },
  gestor: {
    noticias: { ...TUDO },
    biodiversidade: { ...TUDO },
    eventos: { ...TUDO },
    atracoes: { ...TUDO },
    gastronomia: { ...TUDO },
    relatos: { ler: true, criar: false, editar: false, excluir: true },
    usuarios: { ...NADA },
  },
  colaborador: {
    noticias: { ...LER_CRIAR_EDITAR },
    biodiversidade: { ...LER_CRIAR_EDITAR },
    eventos: { ...LER_CRIAR_EDITAR },
    atracoes: { ...APENAS_LER },
    gastronomia: { ...LER_CRIAR_EDITAR },
    relatos: { ...APENAS_LER },
    usuarios: { ...NADA },
  },
};

// Normaliza o objeto de permissoes a partir do papel e de uma matriz opcional enviada pelo cliente.
function normalizarPermissoes(papel = "colaborador", entrada = null) {
  if (!PAPEIS.includes(papel)) {
    throw new ErroValidacao([`papel deve ser um de: ${PAPEIS.join(", ")}.`]);
  }
  if (papel === "admin") {
    return structuredClone(PERFIS_PADRAO.admin);
  }
  let fonte = entrada;
  if (typeof fonte === "string") {
    try { fonte = JSON.parse(fonte); } catch { fonte = null; }
  }
  const base = PERFIS_PADRAO[papel] || {};
  const resultado = {};
  for (const mod of MODULOS_SISTEMA) {
    const origem = (fonte && typeof fonte === "object" && fonte[mod]) ? fonte[mod] : (base[mod] || NADA);
    resultado[mod] = matriz(origem);
    // Se tiver criar/editar/excluir, garante ler = true para poder ver o modulo no painel.
    if (resultado[mod].criar || resultado[mod].editar || resultado[mod].excluir) {
      resultado[mod].ler = true;
    }
  }
  return resultado;
}

function lerPermissoesBanco(usuario) {
  if (!usuario) return normalizarPermissoes("colaborador");
  if (usuario.papel === "admin") return normalizarPermissoes("admin");
  let bruto = null;
  if (usuario.permissoes) {
    try { bruto = typeof usuario.permissoes === "string" ? JSON.parse(usuario.permissoes) : usuario.permissoes; } catch { bruto = null; }
  }
  const temChaves = bruto && typeof bruto === "object" && Object.keys(bruto).length > 0;
  return normalizarPermissoes(usuario.papel || "colaborador", temChaves ? bruto : null);
}

function temPermissao(usuario, modulo, acao) {
  if (!usuario) return false;
  if (usuario.papel === "admin") return true;
  const perms = usuario.permissoes && typeof usuario.permissoes === "object"
    ? usuario.permissoes
    : lerPermissoesBanco(usuario);
  return Boolean(perms?.[modulo]?.[acao]);
}

function podeEnviarImagem(usuario) {
  if (!usuario) return false;
  if (usuario.papel === "admin") return true;
  const perms = usuario.permissoes && typeof usuario.permissoes === "object"
    ? usuario.permissoes
    : lerPermissoesBanco(usuario);
  return MODULOS_SISTEMA.some((m) => perms?.[m]?.criar || perms?.[m]?.editar);
}

module.exports = {
  MODULOS_SISTEMA,
  ACOES,
  PAPEIS,
  PERFIS_PADRAO,
  normalizarPermissoes,
  lerPermissoesBanco,
  temPermissao,
  podeEnviarImagem,
};
