"use strict";

const db = require("../database/connection");
const {
  ErroNaoEncontrado, exigirCampos, validarTexto, validarDataHora, validarEnum, validarUrlOpcional,
  validarBooleano, validarImagemId, paginacao,
} = require("../utils/validacao");
const { comImagem, montarSet } = require("../utils/serializar");

const PERMANENCIAS = ["Permanente", "Temporário"];
const SELECT_BASE = "SELECT e.*, a.nome AS atracao_nome FROM eventos e JOIN atracoes a ON a.id = e.atracao_id";

function buscarPorId(id) {
  const evento = db.prepare(`${SELECT_BASE} WHERE e.id = ?`).get(id);
  if (!evento) throw new ErroNaoEncontrado("Evento não encontrado.");
  return comImagem(evento);
}

// Por padrao lista os proximos eventos (ainda nao encerrados). ?todos=1 lista tudo.
function listar(req, res) {
  const { limite, pagina, offset } = paginacao(req.query);
  const filtros = [];
  const params = {};
  if (req.query.atracao_id) { filtros.push("e.atracao_id = @atracao_id"); params.atracao_id = Number(req.query.atracao_id); }
  if (!req.query.todos && !req.query.atracao_id) {
    filtros.push("date(COALESCE(e.data_fim, e.data_hora)) >= date('now','localtime')");
  }
  const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";
  const total = db.prepare(`SELECT COUNT(*) AS total FROM eventos e ${where}`).get(params).total;
  const linhas = db.prepare(`${SELECT_BASE} ${where} ORDER BY e.data_hora LIMIT @limite OFFSET @offset`)
    .all({ ...params, limite, offset });
  return res.json({ total, pagina, limite, eventos: linhas.map(comImagem) });
}

function detalhar(req, res) {
  return res.json(buscarPorId(req.params.id));
}

function validarPeriodo(inicio, fim) {
  if (fim && fim < inicio) {
    const { ErroValidacao } = require("../utils/validacao");
    throw new ErroValidacao(["data_fim não pode ser anterior a data_hora."]);
  }
}

function criar(req, res) {
  const b = req.body;
  exigirCampos(b, ["atracao_id", "titulo", "data_hora"]);
  const atracaoId = Number(b.atracao_id);
  if (!db.prepare("SELECT id FROM atracoes WHERE id = ?").get(atracaoId)) {
    return res.status(400).json({ erros: ["atracao_id não corresponde a uma atração existente."] });
  }
  const atracao = db.prepare("SELECT nome FROM atracoes WHERE id = ?").get(atracaoId);
  const dados = {
    atracao_id: atracaoId,
    titulo: validarTexto(b.titulo, { campo: "titulo", min: 3, max: 120 }),
    data_hora: validarDataHora(b.data_hora),
    data_fim: b.data_fim ? validarDataHora(b.data_fim, "data_fim") : null,
    descricao: validarTexto(b.descricao || "", { campo: "descricao", min: 0, max: 1500 }),
    local: validarTexto(b.local || atracao.nome, { campo: "local", min: 2, max: 150 }),
    link: validarUrlOpcional(b.link),
    funcionamento: validarTexto(b.funcionamento || "", { campo: "funcionamento", min: 0, max: 200 }),
    gratuito: validarBooleano(b.gratuito, 1),
    permanencia: validarEnum(b.permanencia || "Temporário", PERMANENCIAS, "permanencia"),
    imagem_id: validarImagemId(b.imagem_id, db),
  };
  validarPeriodo(dados.data_hora, dados.data_fim);
  const info = db.prepare(`
    INSERT INTO eventos (atracao_id, titulo, data_hora, data_fim, descricao, local, link, funcionamento, gratuito, permanencia, imagem_id)
    VALUES (@atracao_id, @titulo, @data_hora, @data_fim, @descricao, @local, @link, @funcionamento, @gratuito, @permanencia, @imagem_id)
  `).run(dados);
  return res.status(201).json(buscarPorId(info.lastInsertRowid));
}

function atualizar(req, res) {
  const atual = buscarPorId(req.params.id);
  const b = req.body;
  const a = {};
  if (b.atracao_id !== undefined) {
    const id = Number(b.atracao_id);
    if (!db.prepare("SELECT id FROM atracoes WHERE id = ?").get(id)) {
      return res.status(400).json({ erros: ["atracao_id não corresponde a uma atração existente."] });
    }
    a.atracao_id = id;
  }
  if (b.titulo !== undefined) a.titulo = validarTexto(b.titulo, { campo: "titulo", min: 3, max: 120 });
  if (b.data_hora !== undefined) a.data_hora = validarDataHora(b.data_hora);
  if (b.data_fim !== undefined) a.data_fim = b.data_fim ? validarDataHora(b.data_fim, "data_fim") : null;
  if (b.descricao !== undefined) a.descricao = validarTexto(b.descricao, { campo: "descricao", min: 0, max: 1500 });
  if (b.local !== undefined && String(b.local).trim()) a.local = validarTexto(b.local, { campo: "local", min: 2, max: 150 });
  if (b.link !== undefined) a.link = validarUrlOpcional(b.link);
  if (b.funcionamento !== undefined) a.funcionamento = validarTexto(b.funcionamento, { campo: "funcionamento", min: 0, max: 200 });
  if (b.gratuito !== undefined) a.gratuito = validarBooleano(b.gratuito);
  if (b.permanencia !== undefined) a.permanencia = validarEnum(b.permanencia, PERMANENCIAS, "permanencia");
  if (b.imagem_id !== undefined) a.imagem_id = validarImagemId(b.imagem_id, db);
  if (Object.keys(a).length === 0) {
    return res.status(400).json({ erros: ["Nada para atualizar."] });
  }
  validarPeriodo(a.data_hora ?? atual.data_hora, a.data_fim !== undefined ? a.data_fim : atual.data_fim);
  db.prepare(`UPDATE eventos SET ${montarSet(a)} WHERE id = @id`).run({ ...a, id: req.params.id });
  return res.json(buscarPorId(req.params.id));
}

function remover(req, res) {
  buscarPorId(req.params.id);
  db.prepare("DELETE FROM eventos WHERE id = ?").run(req.params.id);
  return res.status(204).send();
}

module.exports = { listar, detalhar, criar, atualizar, remover };
