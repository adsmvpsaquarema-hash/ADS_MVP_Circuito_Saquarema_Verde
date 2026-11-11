"use strict";

const fs = require("node:fs");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const db = require("./connection");
const config = require("../config");

const DIR_IMG = path.join(__dirname, "..", "..", "public", "assets", "img");
const DIR_ASSETS = path.join(__dirname, "..", "..", "public", "assets");

const MIMES = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const cacheImagens = new Map();

// Guarda um arquivo local na tabela imagens (sem duplicar binarios identicos). Retorna o id ou null.
function imagemDeArquivo(caminho) {
  if (cacheImagens.has(caminho)) return cacheImagens.get(caminho);
  if (!fs.existsSync(caminho)) return null;
  const dados = fs.readFileSync(caminho);
  const mime = MIMES[path.extname(caminho).toLowerCase()];
  const existente = db.prepare("SELECT id FROM imagens WHERE mime = ? AND tamanho = ? AND dados = ?").get(mime, dados.length, dados);
  if (existente) {
    cacheImagens.set(caminho, Number(existente.id));
    return Number(existente.id);
  }
  const info = db.prepare("INSERT INTO imagens (mime, tamanho, dados) VALUES (?, ?, ?)").run(mime, dados.length, dados);
  cacheImagens.set(caminho, Number(info.lastInsertRowid));
  return Number(info.lastInsertRowid);
}

const img = (nome) => imagemDeArquivo(path.join(DIR_IMG, nome));
const logo = (nome) => imagemDeArquivo(path.join(DIR_ASSETS, nome));

function idAtracao(slug) {
  return db.prepare("SELECT id FROM atracoes WHERE slug = ?").get(slug)?.id;
}

function executarSeed() {
  cacheImagens.clear();

  const adminExiste = db.prepare("SELECT COUNT(*) AS total FROM administradores").get().total > 0;
  if (!adminExiste) {
    const hash = bcrypt.hashSync(config.adminSenhaPadrao, 10);
    const { normalizarPermissoes } = require("../utils/permissoes");
    db.prepare(
      "INSERT INTO administradores (nome, email, senha_hash, papel, permissoes) VALUES (?, ?, ?, 'admin', ?)"
    ).run("Administrador Saquarema Verde", "admin@saquaremaverde.local", hash, JSON.stringify(normalizarPermissoes("admin")));
    console.log("[seed] Administrador criado (email: admin@saquaremaverde.local).");
  } else {
    const { normalizarPermissoes } = require("../utils/permissoes");
    db.prepare("UPDATE administradores SET permissoes = ? WHERE papel = 'admin' AND (permissoes IS NULL OR permissoes = '{}')")
      .run(JSON.stringify(normalizarPermissoes("admin")));
  }

  const atracoes = [
    { slug: "costa-do-sol", nome: "Parque Estadual da Costa do Sol", categoria: "Parque",
      descricao: "Trilhas costeiras com mirantes, praias desertas e observação de aves.",
      localizacao: "Saquarema - RJ", condicao: "Aberta", horarios: "08:00 às 17:00",
      regras_visitacao: "Não deixe lixo, não alimente os animais e permaneça nas trilhas sinalizadas.", imagem: "lagoa.jpg" },
    { slug: "jacarepia", nome: "Reserva Ecológica Estadual de Jacarepiá", categoria: "Reserva",
      descricao: "Área de preservação com vegetação de restinga, lagoas e fauna silvestre.",
      localizacao: "Saquarema - RJ", condicao: "Aberta", horarios: "09:00 às 15:00 (somente com guia)",
      regras_visitacao: "Visitação somente acompanhada de guia credenciado. Proibido fumar e acender fogueiras.", imagem: "Pedra_Branca.jpg" },
    { slug: "pedra-do-padrao", nome: "Pedra Branca", categoria: "Mirante",
      descricao: "Mirante com vista panorâmica de Saquarema e do litoral fluminense.",
      localizacao: "Saquarema - RJ", condicao: "Manutenção", horarios: "Indisponível",
      regras_visitacao: "Acesso temporariamente restrito durante a manutenção.", imagem: "Pedra_Branca_1.jpg" },
    { slug: "centro-historico", nome: "Igreja Matriz de Nossa Senhora de Nazareth", categoria: "Cultural",
      descricao: "Centro histórico, arquitetura colonial e vista clássica sobre a Lagoa de Saquarema.",
      localizacao: "Centro, Saquarema - RJ", condicao: "Aberta", horarios: "Livre",
      regras_visitacao: "Respeite os horários de culto e o patrimônio histórico.", imagem: "vilatur.jpg" },
  ];

  const atracaoExiste = db.prepare("SELECT COUNT(*) AS total FROM atracoes").get().total > 0;
  if (!atracaoExiste) {
    const inserir = db.prepare(`
      INSERT INTO atracoes (slug, nome, categoria, descricao, localizacao, condicao, horarios, regras_visitacao, imagem_id)
      VALUES (@slug, @nome, @categoria, @descricao, @localizacao, @condicao, @horarios, @regras_visitacao, @imagem_id)
    `);
    for (const a of atracoes) inserir.run({ ...a, imagem_id: img(a.imagem) });
    console.log(`[seed] ${atracoes.length} atrações inseridas.`);
  } else {
    // Atualiza nomes, imagens e regras padrao nas atracoes existentes do seed.
    const atualizarAtracao = db.prepare(`
      UPDATE atracoes
      SET nome = @nome,
          imagem_id = @imagem_id,
          regras_visitacao = CASE WHEN regras_visitacao = '' THEN @regras_visitacao ELSE regras_visitacao END
      WHERE slug = @slug
    `);
    for (const a of atracoes) {
      atualizarAtracao.run({
        slug: a.slug,
        nome: a.nome,
        imagem_id: img(a.imagem),
        regras_visitacao: a.regras_visitacao,
      });
    }
  }

  // Biodiversidade (antigas "trilhas" do front)
  const recomendacao = "Levar água, chapéu, óculos de sol, filtro solar, calçado fechado e roupa leve.";
  const bio = [
    { slug: "trilha-lagoa-vermelha", atracao: "costa-do-sol", nome: "Trilha da Lagoa Vermelha", categoria: "Trilha",
      descricao: "Uma trilha curta de aproximadamente 0,53 km em Vilatur. Funcionamento livre durante o dia, gratuita e permanente.",
      localizacao: "Vilatur, Saquarema - RJ", distancia_km: 0.53, dificuldade: "Fácil", duracao: "36 minutos",
      dicas_seguranca: "Evite o horário de sol forte e não entre na lagoa.", funcionamento: "Livre, durante o dia", gratuito: 1, permanencia: "Permanente", imagem: "lagoa.jpg" },
    { slug: "trilha-massambaba", atracao: "costa-do-sol", nome: "Trilha próxima à APA de Massambaba", categoria: "Trilha",
      descricao: "Uma trilha moderada de aproximadamente 2,08 km em Vilatur, próxima à APA de Massambaba. Gratuita e permanente.",
      localizacao: "Vilatur, Saquarema - RJ", distancia_km: 2.08, dificuldade: "Moderada", duracao: "1h02",
      dicas_seguranca: "Use calçado de trilha e avise alguém sobre o roteiro.", funcionamento: "Livre, durante o dia", gratuito: 1, permanencia: "Permanente", imagem: "vilatur.jpg" },
    { slug: "trilha-pedra-branca", atracao: "jacarepia", nome: "Trilha da Pedra Branca", categoria: "Trilha",
      descricao: "Uma trilha longa de aproximadamente 8,9 km em Saquarema - Rio Seco. Gratuita e permanente.",
      localizacao: "Rio Seco, Saquarema - RJ", distancia_km: 8.9, dificuldade: "Moderada", duracao: "3h42",
      dicas_seguranca: "Inicie cedo, leve bastante água e evite a trilha em dias de chuva.", funcionamento: "Livre, durante o dia", gratuito: 1, permanencia: "Permanente", imagem: "Pedra_Branca.jpg" },
    { slug: "restinga-jacarepia", atracao: "jacarepia", nome: "Restinga de Jacarepiá", categoria: "Flora",
      descricao: "Vegetação de restinga típica do litoral fluminense, com bromélias, cactos e espécies endêmicas. Visita com guia.",
      localizacao: "Reserva de Jacarepiá, Saquarema - RJ", dificuldade: null, funcionamento: "09:00 às 15:00, com guia", gratuito: 1, permanencia: "Permanente", imagem: "Restinga.jpeg" },
    { slug: "aves-costa-do-sol", atracao: "costa-do-sol", nome: "Aves da Costa do Sol", categoria: "Fauna",
      descricao: "Observação de aves costeiras e de restinga ao longo das trilhas do parque.",
      localizacao: "Parque Estadual da Costa do Sol, Saquarema - RJ", dificuldade: null, funcionamento: "08:00 às 17:00", gratuito: 1, permanencia: "Permanente", imagem: "Passaros.jpeg" },
  ];
  const inserirBio = db.prepare(`
    INSERT INTO biodiversidade (atracao_id, slug, nome, categoria, descricao, localizacao, distancia_km, dificuldade, duracao,
      recomendacoes, dicas_seguranca, funcionamento, gratuito, permanencia, imagem_id)
    VALUES (@atracao_id, @slug, @nome, @categoria, @descricao, @localizacao, @distancia_km, @dificuldade, @duracao,
      @recomendacoes, @dicas_seguranca, @funcionamento, @gratuito, @permanencia, @imagem_id)
  `);
  const atualizarBioImg = db.prepare("UPDATE biodiversidade SET imagem_id = ? WHERE slug = ?");
  let novos = 0;
  for (const b of bio) {
    if (!idAtracao(b.atracao)) continue;
    const imagemId = img(b.imagem);
    if (db.prepare("SELECT 1 FROM biodiversidade WHERE slug = ?").get(b.slug)) {
      atualizarBioImg.run(imagemId, b.slug);
      continue;
    }
    inserirBio.run({
      distancia_km: null, duracao: null, dicas_seguranca: "", ...b,
      atracao_id: idAtracao(b.atracao), recomendacoes: recomendacao, imagem_id: imagemId,
    });
    novos += 1;
  }
  if (novos) console.log(`[seed] ${novos} itens de biodiversidade inseridos.`);

  // Eventos (proximos eventos do front, com datas de 2026)
  const eventos = [
    { atracao: "costa-do-sol", titulo: "Observação de aves", data_hora: "2026-11-14 07:00", data_fim: null, local: "Parque Estadual da Costa do Sol",
      descricao: "Passeio guiado com binóculos fornecidos.", funcionamento: "07:00 às 10:00", gratuito: 1, permanencia: "Temporário", imagem: "Observador_passaros.jpg" },
    { atracao: "jacarepia", titulo: "Trilha interpretativa com guia", data_hora: "2026-11-12 09:00", data_fim: null, local: "Reserva de Jacarepiá",
      descricao: "Conheça a restinga e a fauna da reserva.", funcionamento: "09:00 às 12:00", gratuito: 1, permanencia: "Temporário", imagem: "Pedra_Branca.jpg" },
    { atracao: "centro-historico", titulo: "Campeonato Brasileiro de Vôlei Master Saquarema", data_hora: "2026-11-15 08:00", data_fim: "2026-11-18 19:00",
      local: "Centro de Desenvolvimento do Voleibol (CDV), Saquarema, RJ", descricao: "Campeonato brasileiro de vôlei master, de 15 a 18 de novembro de 2026.",
      link: "https://wp.cbv.com.br/master-saquarema", funcionamento: "08h às 19h", gratuito: 1, permanencia: "Temporário", imagem: "Master_Volei.png" },
    { atracao: "centro-historico", titulo: "Feira Literária Internacional de Saquarema (FLIS)", data_hora: "2026-11-11 09:00", data_fim: "2026-11-20 21:00",
      local: "Campo de Aviação, Saquarema, RJ", descricao: "Feira literária com programação de 11 a 20 de novembro de 2026.",
      link: "https://www.saquarema.rj.gov.br/", funcionamento: "09h às 21h", gratuito: 1, permanencia: "Temporário", imagem: "Flis.png" },
    { atracao: "centro-historico", titulo: "Natal de Luz 2026", data_hora: "2026-12-01 18:00", data_fim: "2026-12-31 23:59",
      local: "Praça do Canhão, Saquarema, RJ", descricao: "Decoração e programação natalina de 1 a 31 de dezembro de 2026.",
      link: "https://www.saquarema.rj.gov.br/", funcionamento: "18h às 00h", gratuito: 1, permanencia: "Temporário", imagem: "Natal_de_luz.png" },
  ];
  const inserirEvento = db.prepare(`
    INSERT INTO eventos (atracao_id, titulo, data_hora, data_fim, descricao, local, link, funcionamento, gratuito, permanencia, imagem_id)
    VALUES (@atracao_id, @titulo, @data_hora, @data_fim, @descricao, @local, @link, @funcionamento, @gratuito, @permanencia, @imagem_id)
  `);
  const atualizarEventoImg = db.prepare("UPDATE eventos SET imagem_id = ? WHERE titulo = ?");
  novos = 0;
  for (const e of eventos) {
    if (!idAtracao(e.atracao)) continue;
    const imagemId = img(e.imagem);
    if (db.prepare("SELECT 1 FROM eventos WHERE titulo = ?").get(e.titulo)) {
      atualizarEventoImg.run(imagemId, e.titulo);
      continue;
    }
    inserirEvento.run({ link: null, ...e, atracao_id: idAtracao(e.atracao), imagem_id: imagemId });
    novos += 1;
  }
  if (novos) console.log(`[seed] ${novos} eventos inseridos.`);

  // Eventos antigos sem imagem herdam a imagem da atracao
  db.exec(`UPDATE eventos SET imagem_id = (SELECT imagem_id FROM atracoes WHERE atracoes.id = eventos.atracao_id) WHERE imagem_id IS NULL`);

  // Gastronomia
  const restaurantes = [
    { nome: "Restaurante Estrela do Mar", descricao: "Um restaurante especialista em frutos do mar.", endereco: "Av. Beira Mar, 1225 - Vilatur, Saquarema - RJ",
      funcionamento: "09h às 17h, de quarta-feira a domingo", telefone: "(22) 97402-1787", imagem: "Estrela_do_mar.jpg" },
    { nome: "Restaurante Espaço do Sabor", descricao: "Um restaurante especialista em frutos do mar.", endereco: "Av. Beira Mar, 2447 - Vilatur, Saquarema - RJ",
      funcionamento: "09h às 17h, de quarta-feira a domingo", telefone: "(22) 98166-2827", imagem: "Espaço_do_sabor.png" },
    { nome: "Restaurante Garota de Itaúna", descricao: "Um restaurante beira-mar.", endereco: "Av. Oceânica, 165 - Itaúna, Saquarema - RJ",
      funcionamento: "09h às 17h, de terça-feira a domingo", telefone: "(22) 99989-2903", imagem: "Garota_de_itauná.jpg" },
  ];
  const inserirRest = db.prepare(`
    INSERT INTO gastronomia (nome, tipo, descricao, endereco, funcionamento, telefone, imagem_id)
    VALUES (@nome, 'Restaurante', @descricao, @endereco, @funcionamento, @telefone, @imagem_id)
  `);
  const atualizarRestImg = db.prepare("UPDATE gastronomia SET imagem_id = ? WHERE nome = ?");
  novos = 0;
  for (const r of restaurantes) {
    const imagemId = img(r.imagem);
    if (db.prepare("SELECT 1 FROM gastronomia WHERE nome = ?").get(r.nome)) {
      atualizarRestImg.run(imagemId, r.nome);
      continue;
    }
    inserirRest.run({ ...r, imagem_id: imagemId });
    novos += 1;
  }
  if (novos) console.log(`[seed] ${novos} itens de gastronomia inseridos.`);

  // Noticias
  const noticias = [
    { titulo: "Bem-vindo ao Saquarema Verde Online", resumo: "Informações sobre biodiversidade, eventos e gastronomia da cidade em um só lugar.",
      conteudo: "Aqui você encontra informações sobre turismo, biodiversidade, gastronomia e eventos de Saquarema. Planeje sua visita ao Parque Estadual da Costa do Sol e à Reserva de Jacarepiá.", imagem: "Pedra_Branca.jpg" },
    { titulo: "Programação de novembro e dezembro", resumo: "Vôlei Master, FLIS e Natal de Luz movimentam a cidade.",
      conteudo: "Confira os próximos eventos: Campeonato Brasileiro de Vôlei Master, Feira Literária Internacional de Saquarema e o Natal de Luz.", imagem: "vilatur.jpg" },
  ];
  const inserirNoticia = db.prepare(
    "INSERT INTO noticias (titulo, resumo, conteudo, imagem_id) VALUES (@titulo, @resumo, @conteudo, @imagem_id)"
  );
  novos = 0;
  for (const n of noticias) {
    if (db.prepare("SELECT 1 FROM noticias WHERE titulo = ?").get(n.titulo)) continue;
    inserirNoticia.run({ ...n, imagem_id: img(n.imagem) });
    novos += 1;
  }
  if (novos) console.log(`[seed] ${novos} notícias inseridas.`);

  // Noticias antigas (sem imagem) recebem imagem padrao: a imagem e obrigatoria.
  const semImagem = db.prepare("SELECT COUNT(*) AS total FROM noticias WHERE imagem_id IS NULL").get().total;
  if (semImagem) {
    const padrao = logo("logo3.png") || img("Pedra_Branca.jpg");
    db.prepare("UPDATE noticias SET imagem_id = ? WHERE imagem_id IS NULL").run(padrao);
    db.exec("UPDATE noticias SET resumo = substr(conteudo, 1, 140) WHERE resumo = ''");
    console.log(`[seed] ${semImagem} notícia(s) antiga(s) receberam imagem padrão.`);
  }

  const relatoExiste = db.prepare("SELECT COUNT(*) AS total FROM relatos").get().total > 0;
  if (!relatoExiste) {
    const inserir = db.prepare("INSERT INTO relatos (atracao_id, nome, texto) VALUES (?, ?, ?)");
    const primeira = db.prepare("SELECT id FROM atracoes ORDER BY id LIMIT 1").get()?.id;
    if (!primeira) return;
    inserir.run(idAtracao("costa-do-sol") ?? primeira, "Mariana L.", "Trilha da Costa do Sol incrível! O mirante no final vale cada passo.");
    inserir.run(idAtracao("jacarepia") ?? primeira, "Rafael T.", "A reserva de Jacarepiá é um tesouro. O guia explicou muito sobre a restinga.");
    console.log("[seed] Relatos inseridos.");
  }
}

module.exports = { executarSeed, imagemDeArquivo };

if (require.main === module) {
  executarSeed();
  console.log("[seed] Concluído.");
}
