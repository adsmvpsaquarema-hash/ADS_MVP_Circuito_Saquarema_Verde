"use strict";

// Configura o banco em memoria ANTES de importar o app.
process.env.DB_PATH = ":memory:";
process.env.JWT_SECRET = "segredo-de-teste";

const test = require("node:test");
const assert = require("node:assert/strict");

const { executarSeed } = require("../src/database/seed");
const { criarApp } = require("../src/app");

let servidor;
let baseUrl;
let host;

// PNG 1x1 valido
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

test.before(async () => {
  executarSeed();
  const app = criarApp();
  await new Promise((resolve) => {
    servidor = app.listen(0, "127.0.0.1", resolve);
  });
  host = `http://127.0.0.1:${servidor.address().port}`;
  baseUrl = `${host}/api`;
});

test.after(() => servidor.close());

async function chamar(metodo, caminho, { corpo, token } = {}) {
  const resposta = await fetch(baseUrl + caminho, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await resposta.text();
  return { status: resposta.status, json: texto ? JSON.parse(texto) : null };
}

async function enviarImagem(token, buffer = PNG, tipo = "image/png") {
  const resposta = await fetch(`${baseUrl}/imagens`, {
    method: "POST",
    headers: { "Content-Type": tipo, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: buffer,
  });
  const texto = await resposta.text();
  return { status: resposta.status, json: texto ? JSON.parse(texto) : null };
}

async function loginAdmin() {
  const { status, json } = await chamar("POST", "/auth/login", {
    corpo: { email: "admin@saquaremaverde.local", senha: "Admin@123" },
  });
  assert.equal(status, 200);
  return json.token;
}

test("GET /api/saude responde ok", async () => {
  const { status, json } = await chamar("GET", "/saude");
  assert.equal(status, 200);
  assert.equal(json.status, "ok");
});

test("rota antiga /api/trilhas nao existe", async () => {
  const { status } = await chamar("GET", "/trilhas");
  assert.equal(status, 404);
});

test("GET /api/atracoes lista as atracoes do seed e filtra por termo", async () => {
  const todas = await chamar("GET", "/atracoes");
  assert.equal(todas.status, 200);
  assert.equal(todas.json.total, 4);
  const filtro = await chamar("GET", "/atracoes?q=jacarepi");
  assert.equal(filtro.json.total, 1);
});

test("GET /api/atracoes/:id retorna subdivisoes biodiversidade e eventos", async () => {
  const { status, json } = await chamar("GET", "/atracoes/1");
  assert.equal(status, 200);
  assert.ok(json.biodiversidade.length >= 1);
  assert.ok(Array.isArray(json.eventos));
  assert.ok(Array.isArray(json.relatos));
  assert.ok(json.imagem_url.startsWith("/api/imagens/"));
  assert.equal((await chamar("GET", "/atracoes/999")).status, 404);
});

test("GET /api/biodiversidade lista, filtra e pagina", async () => {
  const todos = await chamar("GET", "/biodiversidade");
  assert.equal(todos.status, 200);
  assert.ok(todos.json.total >= 3);
  const trilhas = await chamar("GET", "/biodiversidade?categoria=Trilha");
  assert.ok(trilhas.json.biodiversidade.every((b) => b.categoria === "Trilha"));
  const pag = await chamar("GET", "/biodiversidade?limite=1&pagina=2");
  assert.equal(pag.json.biodiversidade.length, 1);
  const detalhe = await chamar("GET", `/biodiversidade/${todos.json.biodiversidade[0].id}`);
  assert.equal(detalhe.status, 200);
  assert.ok(detalhe.json.atracao_nome);
});

test("GET /api/eventos lista proximos eventos com imagem e local", async () => {
  const { status, json } = await chamar("GET", "/eventos");
  assert.equal(status, 200);
  assert.ok(json.total >= 3);
  assert.ok(json.eventos.every((e) => e.local && e.imagem_url));
  assert.ok(json.eventos.some((e) => /Natal de Luz 2026/.test(e.titulo)));
});

test("imagens: upload exige token, tipo valido e tamanho maximo", async () => {
  assert.equal((await enviarImagem(null)).status, 401);
  const token = await loginAdmin();
  assert.equal((await enviarImagem(token, Buffer.from("nao sou imagem"), "image/png")).status, 400);
  assert.equal((await enviarImagem(token, PNG, "text/plain")).status, 400);
  const grande = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024 + 10)]);
  assert.equal((await enviarImagem(token, grande)).status, 413);

  const ok = await enviarImagem(token);
  assert.equal(ok.status, 201);
  const baixar = await fetch(`${host}${ok.json.url}`);
  assert.equal(baixar.status, 200);
  assert.equal(baixar.headers.get("content-type"), "image/png");
  assert.match(baixar.headers.get("cache-control"), /immutable/);
  assert.deepEqual(Buffer.from(await baixar.arrayBuffer()), PNG);
  assert.equal((await fetch(`${baseUrl}/imagens/99999`)).status, 404);
});

test("noticias exigem imagem e aparecem na lista com imagem_url", async () => {
  const token = await loginAdmin();
  const dados = { titulo: "Temporada de baleias começa", conteudo: "Avistamentos já são registrados na costa de Saquarema." };

  assert.equal((await chamar("POST", "/noticias", { corpo: dados })).status, 401);
  const semImagem = await chamar("POST", "/noticias", { corpo: dados, token });
  assert.equal(semImagem.status, 400);
  const invalida = await chamar("POST", "/noticias", { corpo: { ...dados, imagem_id: 99999 }, token });
  assert.equal(invalida.status, 400);

  const img = await enviarImagem(token);
  const criada = await chamar("POST", "/noticias", { corpo: { ...dados, imagem_id: img.json.id }, token });
  assert.equal(criada.status, 201);
  assert.equal(criada.json.imagem_url, img.json.url);

  const lista = await chamar("GET", "/noticias");
  assert.equal(lista.json.noticias[0].titulo, dados.titulo);

  const edit = await chamar("PUT", `/noticias/${criada.json.id}`, { corpo: { titulo: "Baleias chegam a Saquarema" }, token });
  assert.equal(edit.status, 200);
  assert.equal((await chamar("DELETE", `/noticias/${criada.json.id}`, { token })).status, 204);
  assert.equal((await chamar("GET", `/noticias/${criada.json.id}`)).status, 404);
});

test("admin: CRUD de biodiversidade", async () => {
  const token = await loginAdmin();
  assert.equal((await chamar("POST", "/biodiversidade", { corpo: {} })).status, 401);

  const img = await enviarImagem(token);
  const criado = await chamar("POST", "/biodiversidade", {
    token,
    corpo: {
      atracao_id: 1, nome: "Cachoeira do Vale", categoria: "Cachoeira", localizacao: "Vale, Saquarema - RJ",
      descricao: "Cachoeira de fácil acesso, gratuita e aberta o ano todo.", dificuldade: "Fácil", distancia_km: "1,2",
      gratuito: true, permanencia: "Permanente", imagem_id: img.json.id,
    },
  });
  assert.equal(criado.status, 201);
  assert.equal(criado.json.distancia_km, 1.2);
  assert.equal(criado.json.gratuito, 1);

  assert.equal((await chamar("POST", "/biodiversidade", { token, corpo: { atracao_id: 1, nome: "Algo", categoria: "Invalida", localizacao: "x y z", descricao: "descricao longa ok" } })).status, 400);
  assert.equal((await chamar("POST", "/biodiversidade", { token, corpo: { atracao_id: 999, nome: "Algo", categoria: "Fauna", localizacao: "x y z", descricao: "descricao longa ok" } })).status, 400);

  const atualizado = await chamar("PUT", `/biodiversidade/${criado.json.id}`, { token, corpo: { condicao: "Manutenção", gratuito: false } });
  assert.equal(atualizado.status, 200);
  assert.equal(atualizado.json.condicao, "Manutenção");
  assert.equal(atualizado.json.gratuito, 0);

  assert.equal((await chamar("DELETE", `/biodiversidade/${criado.json.id}`, { token })).status, 204);
  assert.equal((await chamar("GET", `/biodiversidade/${criado.json.id}`)).status, 404);
});

test("admin: CRUD de eventos com imagem e periodo", async () => {
  const token = await loginAdmin();
  const img = await enviarImagem(token);
  const evento = await chamar("POST", "/eventos", {
    token,
    corpo: { atracao_id: 1, titulo: "Pôr do sol no mirante", data_hora: "2026-12-20 17:30", imagem_id: img.json.id, link: "https://exemplo.com/evento" },
  });
  assert.equal(evento.status, 201);
  assert.equal(evento.json.atracao_nome, "Parque Estadual da Costa do Sol");
  assert.equal(evento.json.local, "Parque Estadual da Costa do Sol");
  assert.equal(evento.json.imagem_url, img.json.url);

  const periodoInvalido = await chamar("POST", "/eventos", {
    token, corpo: { atracao_id: 1, titulo: "Evento invertido", data_hora: "2026-12-20 17:30", data_fim: "2026-12-19 10:00" },
  });
  assert.equal(periodoInvalido.status, 400);
  const linkInvalido = await chamar("POST", "/eventos", {
    token, corpo: { atracao_id: 1, titulo: "Evento link", data_hora: "2026-12-20 17:30", link: "javascript:alert(1)" },
  });
  assert.equal(linkInvalido.status, 400);

  const edit = await chamar("PUT", `/eventos/${evento.json.id}`, { token, corpo: { permanencia: "Permanente", gratuito: 0 } });
  assert.equal(edit.json.permanencia, "Permanente");
  assert.equal((await chamar("DELETE", `/eventos/${evento.json.id}`, { token })).status, 204);
});

test("admin: CRUD de gastronomia e atracoes", async () => {
  const token = await loginAdmin();
  const lista = await chamar("GET", "/gastronomia");
  assert.ok(lista.json.total >= 3);

  const g = await chamar("POST", "/gastronomia", {
    token, corpo: { nome: "Quiosque do Mar", descricao: "Petiscos de frutos do mar", endereco: "Av. Oceânica, 100 - Itaúna" },
  });
  assert.equal(g.status, 201);
  assert.equal((await chamar("PUT", `/gastronomia/${g.json.id}`, { token, corpo: { telefone: "(22) 99999-0000" } })).json.telefone, "(22) 99999-0000");
  assert.equal((await chamar("DELETE", `/gastronomia/${g.json.id}`, { token })).status, 204);

  const a = await chamar("POST", "/atracoes", {
    token, corpo: { slug: "lagoa-saquarema", nome: "Lagoa de Saquarema", categoria: "Lagoa", descricao: "Lagoa com vista para o centro histórico." },
  });
  assert.equal(a.status, 201);
  assert.equal((await chamar("POST", "/atracoes", { token, corpo: { slug: "lagoa-saquarema", nome: "Lagoa 2", categoria: "Lagoa", descricao: "Descrição qualquer longa." } })).status, 409);
  const upd = await chamar("PUT", `/atracoes/${a.json.id}`, { token, corpo: { condicao: "Fechada", horarios: "Indisponível" } });
  assert.equal(upd.json.condicao, "Fechada");
  assert.equal((await chamar("PUT", "/atracoes/1", { token, corpo: { condicao: "Interditada" } })).status, 400);
  assert.equal((await chamar("DELETE", `/atracoes/${a.json.id}`, { token })).status, 204);
});

test("comunidade: relatos publicos com validacao e moderacao admin", async () => {
  const criado = await chamar("POST", "/relatos", {
    corpo: { nome: "Ana P.", atracao_id: 1, texto: "Passeio maravilhoso com a família, trilha bem sinalizada." },
  });
  assert.equal(criado.status, 201);
  assert.equal(criado.json.nome, "Ana P.");

  const bio = (await chamar("GET", "/biodiversidade?atracao_id=1")).json.biodiversidade[0];
  const comBio = await chamar("POST", "/relatos", {
    corpo: { nome: "Beto", atracao_id: 1, biodiversidade_id: bio.id, texto: "Vista incrível, recomendo levar água." },
  });
  assert.equal(comBio.status, 201);
  assert.equal(comBio.json.biodiversidade_nome, bio.nome);

  const invalido = await chamar("POST", "/relatos", { corpo: { nome: "A", atracao_id: 1, texto: "curto" } });
  assert.equal(invalido.status, 400);
  assert.ok(invalido.json.erros.length >= 2);

  assert.equal((await chamar("DELETE", `/relatos/${criado.json.id}`)).status, 401);
  const token = await loginAdmin();
  assert.equal((await chamar("DELETE", `/relatos/${criado.json.id}`, { token })).status, 204);
  assert.equal((await chamar("DELETE", `/relatos/${criado.json.id}`, { token })).status, 404);
});

test("login rejeita senha errada e rotas administrativas exigem token", async () => {
  const { status } = await chamar("POST", "/auth/login", {
    corpo: { email: "admin@saquaremaverde.local", senha: "senhaErrada1" },
  });
  assert.equal(status, 401);
  assert.equal((await chamar("PUT", "/atracoes/3", { corpo: { condicao: "Aberta" } })).status, 401);
});

test("front: home e CORS restrito", async () => {
  const home = await fetch(`${host}/`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /<html/);
  const res = await fetch(`${baseUrl}/saude`, { headers: { Origin: "http://outro-site.com" } });
  assert.equal(res.headers.get("access-control-allow-origin"), null);
});

test("usuarios e permissoes por modulo (RBAC)", async () => {
  const tokenAdmin = await loginAdmin();

  // Lista usuarios
  const lista = await chamar("GET", "/usuarios", { token: tokenAdmin });
  assert.equal(lista.status, 200);
  assert.ok(lista.json.total >= 1);
  assert.ok(lista.json.perfis_padrao.colaborador);

  // Nao permite excluir a propria conta ou o unico admin
  const autoDel = await chamar("DELETE", "/usuarios/1", { token: tokenAdmin });
  assert.equal(autoDel.status, 400);

  // Cria colaborador com permissoes personalizadas: apenas criar/ler em eventos, sem excluir e sem atracoes
  const novo = await chamar("POST", "/usuarios", {
    token: tokenAdmin,
    corpo: {
      nome: "Colaborador Eventos",
      email: "colab@saquarema.local",
      senha: "Colab@123",
      papel: "personalizado",
      permissoes: {
        eventos: { ler: true, criar: true, editar: false, excluir: false },
        atracoes: { ler: true, criar: false, editar: false, excluir: false },
      },
    },
  });
  assert.equal(novo.status, 201);
  assert.equal(novo.json.permissoes.eventos.criar, true);
  assert.equal(novo.json.permissoes.eventos.excluir, false);
  assert.equal(novo.json.permissoes.usuarios.ler, false);

  // Login com o novo usuario
  const loginColab = await chamar("POST", "/auth/login", {
    corpo: { email: "colab@saquarema.local", senha: "Colab@123" },
  });
  assert.equal(loginColab.status, 200);
  const tokenColab = loginColab.json.token;

  // Colaborador consegue criar evento (tem permissao criar em eventos)
  const ev = await chamar("POST", "/eventos", {
    token: tokenColab,
    corpo: { atracao_id: 1, titulo: "Evento do Colaborador", data_hora: "2026-12-10 09:00" },
  });
  assert.equal(ev.status, 201);

  // Colaborador NAO consegue editar nem excluir evento (403)
  assert.equal((await chamar("PUT", `/eventos/${ev.json.id}`, { token: tokenColab, corpo: { titulo: "Tentativa" } })).status, 403);
  assert.equal((await chamar("DELETE", `/eventos/${ev.json.id}`, { token: tokenColab })).status, 403);

  // Colaborador NAO consegue acessar gestao de usuarios (403)
  assert.equal((await chamar("GET", "/usuarios", { token: tokenColab })).status, 403);

  // Admin atualiza colaborador para gestor e depois remove
  const promovido = await chamar("PUT", `/usuarios/${novo.json.id}`, {
    token: tokenAdmin,
    corpo: { papel: "gestor" },
  });
  assert.equal(promovido.status, 200);
  assert.equal(promovido.json.permissoes.eventos.excluir, true);

  assert.equal((await chamar("DELETE", `/eventos/${ev.json.id}`, { token: tokenColab })).status, 204);
  assert.equal((await chamar("DELETE", `/usuarios/${novo.json.id}`, { token: tokenAdmin })).status, 204);
});
