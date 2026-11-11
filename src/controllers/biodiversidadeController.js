"use strict";

const db = require("../database/connection");
const {
  ErroNaoEncontrado, exigirCampos, validarTexto, validarCondicao, validarEnum, validarNumeroOpcional,
  validarBooleano, validarImagemId, paginacao,
} = require("../utils/validacao");
const { comImagem, montarSet } = require("../utils/serializar");

const CATEGORIAS = ["Trilha", "Cachoeira", "Mirante", "Fauna", "Flora", "Outro"];
const DIFICULDADES = ["Fácil", "Moderada", "Difícil"];
const PERMANENCIAS = ["Permanente", "Temporário"];

function buscarPorId(id) {
  const item = db.prepare(`
    SELECT b.*, a.nome AS atracao_nome FROM biodiversidade b
    JOIN atracoes a ON a.id = b.atracao_id WHERE b.id = ?
  `).get(id);
  if (!item) throw new ErroNaoEncontrado("Item de biodiversidade não encontrado.");
  return comImagem(item);
}

function listar(req, res) {
  const { limite, pagina, offset } = paginacao(req.query);
  const filtros = [];
  const params = {};
  if (req.query.atracao_id) { filtros.push("b.atracao_id = @atracao_id"); params.atracao_id = Number(req.query.atracao_id); }
  if (req.query.categoria) { filtros.push("b.categoria = @categoria"); params.categoria = String(req.query.categoria); }
  if (req.query.dificuldade) { filtros.push("b.dificuldade = @dificuldade"); params.dificuldade = String(req.query.dificuldade); }
  if (req.query.q) {
    filtros.push("(b.nome LIKE @q OR b.descricao LIKE @q OR b.localizacao LIKE @q)");
    params.q = `%${String(req.query.q).trim()}%`;
  }
  const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";
  const total = db.prepare(`SELECT COUNT(*) AS total FROM biodiversidade b ${where}`).get(params).total;
  const linhas = db.prepare(`
    SELECT b.*, a.nome AS atracao_nome FROM biodiversidade b
    JOIN atracoes a ON a.id = b.atracao_id ${where}
    ORDER BY b.categoria, b.nome LIMIT @limite OFFSET @offset
  `).all({ ...params, limite, offset });
  return res.json({ total, pagina, limite, biodiversidade: linhas.map(comImagem) });
}

function detalhar(req, res) {
  return res.json(buscarPorId(req.params.id));
}

function slugDe(nome) {
  return nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function criar(req, res) {
  const b = req.body;
  exigirCampos(b, ["atracao_id", "nome", "categoria", "descricao", "localizacao"]);
  const atracaoId = Number(b.atracao_id);
  if (!db.prepare("SELECT id FROM atracoes WHERE id = ?").get(atracaoId)) {
    return res.status(400).json({ erros: ["atracao_id não corresponde a uma atração existente."] });
  }
  const nome = validarTexto(b.nome, { campo: "nome", min: 3, max: 120 });
  const dificuldade = b.dificuldade ? validarEnum(b.dificuldade, DIFICULDADES, "dificuldade") : null;
  const dados = {
    atracao_id: atracaoId,
    slug: slugDe(b.slug || nome),
    nome,
    categoria: validarEnum(b.categoria, CATEGORIAS, "categoria"),
    descricao: validarTexto(b.descricao, { campo: "descricao", min: 10, max: 2000 }),
    localizacao: validarTexto(b.localizacao, { campo: "localizacao", min: 3, max: 150 }),
    distancia_km: validarNumeroOpcional(b.distancia_km, "distancia_km", { max: 500 }),
    dificuldade,
    duracao: b.duracao ? validarTexto(b.duracao, { campo: "duracao", min: 1, max: 30 }) : null,
    recomendacoes: validarTexto(b.recomendacoes || "", { campo: "recomendacoes", min: 0, max: 1000 }),
    dicas_seguranca: validarTexto(b.dicas_seguranca || "", { campo: "dicas_seguranca", min: 0, max: 1000 }),
    funcionamento: validarTexto(b.funcionamento || "", { campo: "funcionamento", min: 0, max: 200 }),
    gratuito: validarBooleano(b.gratuito, 1),
    permanencia: validarEnum(b.permanencia || "Permanente", PERMANENCIAS, "permanencia"),
    condicao: validarCondicao(b.condicao || "Aberta"),
    imagem_id: validarImagemId(b.imagem_id, db),
  };
  if (!dados.slug) return res.status(400).json({ erros: ["slug inválido."] });
  try {
    const info = db.prepare(`
      INSERT INTO biodiversidade (atracao_id, slug, nome, categoria, descricao, localizacao, distancia_km, dificuldade, duracao,
        recomendacoes, dicas_seguranca, funcionamento, gratuito, permanencia, condicao, imagem_id)
      VALUES (@atracao_id, @slug, @nome, @categoria, @descricao, @localizacao, @distancia_km, @dificuldade, @duracao,
        @recomendacoes, @dicas_seguranca, @funcionamento, @gratuito, @permanencia, @condicao, @imagem_id)
    `).run(dados);
    return res.status(201).json(buscarPorId(info.lastInsertRowid));
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) return res.status(409).json({ erro: "Já existe um item com esse slug/nome." });
    throw err;
  }
}

function atualizar(req, res) {
  buscarPorId(req.params.id);
  const b = req.body;
  const a = {};
  if (b.atracao_id !== undefined) {
    const id = Number(b.atracao_id);
    if (!db.prepare("SELECT id FROM atracoes WHERE id = ?").get(id)) {
      return res.status(400).json({ erros: ["atracao_id não corresponde a uma atração existente."] });
    }
    a.atracao_id = id;
  }
  if (b.nome !== undefined) a.nome = validarTexto(b.nome, { campo: "nome", min: 3, max: 120 });
  if (b.categoria !== undefined) a.categoria = validarEnum(b.categoria, CATEGORIAS, "categoria");
  if (b.descricao !== undefined) a.descricao = validarTexto(b.descricao, { campo: "descricao", min: 10, max: 2000 });
  if (b.localizacao !== undefined) a.localizacao = validarTexto(b.localizacao, { campo: "localizacao", min: 3, max: 150 });
  if (b.distancia_km !== undefined) a.distancia_km = validarNumeroOpcional(b.distancia_km, "distancia_km", { max: 500 });
  if (b.dificuldade !== undefined) a.dificuldade = b.dificuldade ? validarEnum(b.dificuldade, DIFICULDADES, "dificuldade") : null;
  if (b.duracao !== undefined) a.duracao = b.duracao ? validarTexto(b.duracao, { campo: "duracao", min: 1, max: 30 }) : null;
  if (b.recomendacoes !== undefined) a.recomendacoes = validarTexto(b.recomendacoes, { campo: "recomendacoes", min: 0, max: 1000 });
  if (b.dicas_seguranca !== undefined) a.dicas_seguranca = validarTexto(b.dicas_seguranca, { campo: "dicas_seguranca", min: 0, max: 1000 });
  if (b.funcionamento !== undefined) a.funcionamento = validarTexto(b.funcionamento, { campo: "funcionamento", min: 0, max: 200 });
  if (b.gratuito !== undefined) a.gratuito = validarBooleano(b.gratuito);
  if (b.permanencia !== undefined) a.permanencia = validarEnum(b.permanencia, PERMANENCIAS, "permanencia");
  if (b.condicao !== undefined) a.condicao = validarCondicao(b.condicao);
  if (b.imagem_id !== undefined) a.imagem_id = validarImagemId(b.imagem_id, db);
  if (Object.keys(a).length === 0) return res.status(400).json({ erros: ["Nada para atualizar."] });
  db.prepare(`UPDATE biodiversidade SET ${montarSet(a)}, atualizado_em = datetime('now','localtime') WHERE id = @id`)
    .run({ ...a, id: req.params.id });
  return res.json(buscarPorId(req.params.id));
}

function remover(req, res) {
  buscarPorId(req.params.id);
  db.prepare("DELETE FROM biodiversidade WHERE id = ?").run(req.params.id);
  return res.status(204).send();
}

module.exports = { listar, detalhar, criar, atualizar, remover };
