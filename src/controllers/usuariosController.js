"use strict";

const bcrypt = require("bcryptjs");
const db = require("../database/connection");
const {
  ErroValidacao, ErroNaoEncontrado, exigirCampos, validarTexto, validarEmail, validarEnum,
} = require("../utils/validacao");
const { PAPEIS, PERFIS_PADRAO, normalizarPermissoes, lerPermissoesBanco } = require("../utils/permissoes");
const { montarSet } = require("../utils/serializar");

function formatarUsuario(linha) {
  if (!linha) return null;
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    papel: linha.papel,
    permissoes: lerPermissoesBanco(linha),
    criado_em: linha.criado_em,
  };
}

function buscarPorId(id) {
  const linha = db.prepare("SELECT id, nome, email, papel, permissoes, criado_em FROM administradores WHERE id = ?").get(id);
  if (!linha) throw new ErroNaoEncontrado("Usuário não encontrado.");
  return formatarUsuario(linha);
}

function listar(req, res) {
  const linhas = db.prepare(
    "SELECT id, nome, email, papel, permissoes, criado_em FROM administradores ORDER BY id"
  ).all();
  return res.json({
    total: linhas.length,
    usuarios: linhas.map(formatarUsuario),
    perfis_padrao: PERFIS_PADRAO,
  });
}

function detalhar(req, res) {
  return res.json(buscarPorId(req.params.id));
}

function criar(req, res) {
  const b = req.body;
  exigirCampos(b, ["nome", "email", "senha"]);
  const nome = validarTexto(b.nome, { campo: "nome", min: 3, max: 100 });
  const email = validarEmail(b.email);
  const senha = validarTexto(b.senha, { campo: "senha", min: 6, max: 100 });
  const papel = validarEnum(b.papel || "colaborador", PAPEIS, "papel");
  const permissoes = normalizarPermissoes(papel, b.permissoes);

  const senhaHash = bcrypt.hashSync(senha, 10);
  try {
    const info = db.prepare(`
      INSERT INTO administradores (nome, email, senha_hash, papel, permissoes)
      VALUES (@nome, @email, @senha_hash, @papel, @permissoes)
    `).run({
      nome,
      email,
      senha_hash: senhaHash,
      papel,
      permissoes: JSON.stringify(permissoes),
    });
    return res.status(201).json(buscarPorId(info.lastInsertRowid));
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ erro: "Já existe um usuário cadastrado com esse e-mail." });
    }
    throw err;
  }
}

function totalAdmins() {
  return db.prepare("SELECT COUNT(*) AS total FROM administradores WHERE papel = 'admin'").get().total;
}

function atualizar(req, res) {
  const atual = buscarPorId(req.params.id);
  const b = req.body;
  const a = {};

  if (b.nome !== undefined) a.nome = validarTexto(b.nome, { campo: "nome", min: 3, max: 100 });
  if (b.email !== undefined) a.email = validarEmail(b.email);
  if (b.senha !== undefined && String(b.senha).trim() !== "") {
    const senha = validarTexto(b.senha, { campo: "senha", min: 6, max: 100 });
    a.senha_hash = bcrypt.hashSync(senha, 10);
  }

  const novoPapel = b.papel !== undefined ? validarEnum(b.papel, PAPEIS, "papel") : atual.papel;
  if (atual.papel === "admin" && novoPapel !== "admin" && totalAdmins() <= 1) {
    throw new ErroValidacao(["Não é possível alterar o nível do único administrador do sistema."]);
  }
  if (b.papel !== undefined || b.permissoes !== undefined) {
    a.papel = novoPapel;
    const novaMatriz = normalizarPermissoes(novoPapel, b.permissoes !== undefined ? b.permissoes : null);
    a.permissoes = JSON.stringify(novaMatriz);
  }

  if (Object.keys(a).length === 0) {
    return res.status(400).json({ erros: ["Nada para atualizar."] });
  }

  try {
    db.prepare(`UPDATE administradores SET ${montarSet(a)} WHERE id = @id`).run({ ...a, id: req.params.id });
    return res.json(buscarPorId(req.params.id));
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ erro: "Já existe um usuário cadastrado com esse e-mail." });
    }
    throw err;
  }
}

function remover(req, res) {
  const alvo = buscarPorId(req.params.id);
  if (req.usuario && Number(req.usuario.id) === Number(alvo.id)) {
    return res.status(400).json({ erro: "Você não pode excluir a própria conta em uso." });
  }
  if (alvo.papel === "admin" && totalAdmins() <= 1) {
    return res.status(400).json({ erro: "Não é possível excluir o único administrador do sistema." });
  }
  db.prepare("DELETE FROM administradores WHERE id = ?").run(req.params.id);
  return res.status(204).send();
}

module.exports = { listar, detalhar, criar, atualizar, remover };
