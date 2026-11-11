import { api, sessao } from "../api.js";
import { h, limpar, toast, confirmar, mostrarCarregando, mostrarErro, mostrarVazio, seloCondicao, formatarDataHora } from "../ui.js";
import { criarFormulario } from "../formulario.js";
import "../layout.js";

// Protecao de rota: sem token volta para o login.
if (!sessao.token()) location.replace("/login");

document.getElementById("sair").addEventListener("click", () => { sessao.limpar(); location.href = "/login"; });

const CONDICOES = ["Aberta", "Manutenção", "Fechada"];
const PERMANENCIAS = ["Permanente", "Temporário"];
const slugificar = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const opcoesAtracao = (atracoes) => atracoes.map((a) => ({ valor: a.id, texto: a.nome }));

let usuarioLogado = sessao.usuario();

function pode(modulo, acao) {
  if (!usuarioLogado) return false;
  if (usuarioLogado.papel === "admin") return true;
  return Boolean(usuarioLogado.permissoes?.[modulo]?.[acao]);
}

// Cada modulo descreve sua lista, formulario e transformacao do payload: o CRUD e generico.
const MODULOS = [
  {
    id: "noticias", rotulo: "Notícias", tituloNovo: "Publicar nova notícia", tituloEditar: "Editar notícia",
    endpoint: "/noticias", chave: "noticias", imagem: "imagem_url",
    titulo: (i) => i.titulo, detalhe: (i) => formatarDataHora(i.criado_em),
    campos: () => [
      { nome: "titulo", rotulo: "Título", obrigatorio: true, min: 5, max: 150 },
      { nome: "resumo", rotulo: "Resumo (opcional)", max: 200, ajuda: "Aparece no card da página inicial." },
      { nome: "conteudo", rotulo: "Conteúdo", tipo: "textarea", linhas: 6, obrigatorio: true, min: 10, max: 5000 },
      { nome: "imagem_id", rotulo: "Imagem da notícia", tipo: "imagem", obrigatorio: true, ajuda: "Obrigatória. JPEG, PNG ou WebP até 2 MB." },
    ],
  },
  {
    id: "biodiversidade", rotulo: "Biodiversidade", tituloNovo: "Nova biodiversidade", tituloEditar: "Editar biodiversidade",
    endpoint: "/biodiversidade", chave: "biodiversidade", imagem: "imagem_url", limite: 50,
    titulo: (i) => i.nome, detalhe: (i) => `${i.categoria} · ${i.atracao_nome}`,
    campos: ({ atracoes }) => [
      { nome: "nome", rotulo: "Nome", obrigatorio: true, min: 3, max: 120 },
      { nome: "atracao_id", rotulo: "Atração", tipo: "select", obrigatorio: true, opcoes: opcoesAtracao(atracoes), linha: true },
      { nome: "categoria", rotulo: "Categoria", tipo: "select", obrigatorio: true, opcoes: ["Trilha", "Cachoeira", "Mirante", "Fauna", "Flora", "Outro"], linha: true },
      { nome: "descricao", rotulo: "Descrição", tipo: "textarea", obrigatorio: true, min: 10, max: 2000, ajuda: "Informe também se é gratuito e se é permanente ou temporário." },
      { nome: "localizacao", rotulo: "Localização", obrigatorio: true, min: 3, max: 150 },
      { nome: "distancia_km", rotulo: "Distância (km)", tipo: "number", linha: true },
      { nome: "dificuldade", rotulo: "Dificuldade", tipo: "select", opcoes: [{ valor: "", texto: "Não se aplica" }, "Fácil", "Moderada", "Difícil"], linha: true },
      { nome: "duracao", rotulo: "Duração", max: 30, linha: true },
      { nome: "funcionamento", rotulo: "Funcionamento", max: 200, ajuda: "Ex.: Livre, durante o dia." },
      { nome: "permanencia", rotulo: "Permanência", tipo: "select", opcoes: PERMANENCIAS, linha: true },
      { nome: "condicao", rotulo: "Condição", tipo: "select", opcoes: CONDICOES, linha: true },
      { nome: "gratuito", rotulo: "Entrada gratuita", tipo: "checkbox", valorPadrao: true },
      { nome: "recomendacoes", rotulo: "Recomendações", tipo: "textarea", linhas: 2, max: 1000 },
      { nome: "dicas_seguranca", rotulo: "Dicas de segurança", tipo: "textarea", linhas: 2, max: 1000 },
      { nome: "imagem_id", rotulo: "Imagem", tipo: "imagem" },
    ],
  },
  {
    id: "eventos", rotulo: "Eventos", tituloNovo: "Novo evento", tituloEditar: "Editar evento",
    endpoint: "/eventos", chave: "eventos", imagem: "imagem_url", limite: 50, params: { todos: 1 },
    titulo: (i) => i.titulo, detalhe: (i) => `${formatarDataHora(i.data_hora)} · ${i.atracao_nome}`,
    campos: ({ atracoes }) => [
      { nome: "titulo", rotulo: "Título", obrigatorio: true, min: 3, max: 120 },
      { nome: "atracao_id", rotulo: "Atração", tipo: "select", obrigatorio: true, opcoes: opcoesAtracao(atracoes) },
      { nome: "data_hora", rotulo: "Início", tipo: "datetime-local", obrigatorio: true, linha: true },
      { nome: "data_fim", rotulo: "Término (opcional)", tipo: "datetime-local", linha: true },
      { nome: "local", rotulo: "Local", max: 150, ajuda: "Se vazio, usa o nome da atração." },
      { nome: "funcionamento", rotulo: "Horário de funcionamento", max: 200, ajuda: "Ex.: 09h às 21h." },
      { nome: "permanencia", rotulo: "Permanência", tipo: "select", opcoes: PERMANENCIAS, valorPadrao: "Temporário", linha: true },
      { nome: "gratuito", rotulo: "Entrada gratuita", tipo: "checkbox", valorPadrao: true, linha: true },
      { nome: "descricao", rotulo: "Descrição", tipo: "textarea", max: 1500 },
      { nome: "link", rotulo: "Link de mais informações", tipo: "url", max: 300 },
      { nome: "imagem_id", rotulo: "Imagem do evento", tipo: "imagem" },
    ],
  },
  {
    id: "atracoes", rotulo: "Atrações", tituloNovo: "Nova atração", tituloEditar: "Editar atração",
    endpoint: "/atracoes", chave: "atracoes", imagem: "imagem_url",
    titulo: (i) => i.nome, detalhe: (i) => `${i.categoria} · ${i.horarios}`, selo: (i) => seloCondicao(i.condicao),
    campos: () => [
      { nome: "nome", rotulo: "Nome", obrigatorio: true, min: 3, max: 120 },
      { nome: "categoria", rotulo: "Categoria", obrigatorio: true, min: 2, max: 40, ajuda: "Ex.: Parque, Reserva, Mirante, Cultural." },
      { nome: "descricao", rotulo: "Descrição", tipo: "textarea", obrigatorio: true, min: 10, max: 1000 },
      { nome: "localizacao", rotulo: "Localização", obrigatorio: true, min: 3, max: 150, valorPadrao: "Saquarema - RJ" },
      { nome: "horarios", rotulo: "Horários de funcionamento", obrigatorio: true, min: 3, max: 120, valorPadrao: "08:00 às 17:00", linha: true },
      { nome: "condicao", rotulo: "Condição", tipo: "select", opcoes: CONDICOES, linha: true },
      { nome: "regras_visitacao", rotulo: "Regras de visitação", tipo: "textarea", linhas: 3, max: 1500 },
      { nome: "imagem_id", rotulo: "Imagem", tipo: "imagem" },
    ],
    aoCriar: (v) => ({ ...v, slug: slugificar(v.nome) }),
  },
  {
    id: "gastronomia", rotulo: "Gastronomia", tituloNovo: "Novo estabelecimento", tituloEditar: "Editar estabelecimento",
    endpoint: "/gastronomia", chave: "gastronomia", imagem: "imagem_url",
    titulo: (i) => i.nome, detalhe: (i) => i.endereco,
    campos: () => [
      { nome: "nome", rotulo: "Nome", obrigatorio: true, min: 3, max: 120 },
      { nome: "tipo", rotulo: "Tipo", obrigatorio: true, min: 3, max: 40, valorPadrao: "Restaurante", linha: true },
      { nome: "telefone", rotulo: "Telefone", max: 30, linha: true },
      { nome: "descricao", rotulo: "Descrição", tipo: "textarea", obrigatorio: true, min: 5, max: 1000 },
      { nome: "endereco", rotulo: "Endereço", obrigatorio: true, min: 5, max: 200 },
      { nome: "funcionamento", rotulo: "Funcionamento", max: 200 },
      { nome: "imagem_id", rotulo: "Imagem", tipo: "imagem" },
    ],
  },
  { id: "relatos", rotulo: "Relatos", somenteModerar: true, endpoint: "/relatos", chave: "relatos", limite: 100,
    titulo: (i) => `${i.nome}: ${i.texto.slice(0, 80)}`, detalhe: (i) => `${i.biodiversidade_nome || i.atracao_nome} · ${formatarDataHora(i.criado_em)}` },
];

const abas = document.getElementById("abas");
const painel = document.getElementById("painel");
let moduloAtual = null;

function tratarErroAuth(erro) {
  if (erro.status === 401) {
    sessao.limpar();
    toast("Sessão expirada. Faça login novamente.", "erro");
    setTimeout(() => { location.href = "/login"; }, 1200);
    return true;
  }
  return false;
}

async function abrir(id) {
  moduloAtual = MODULOS.find((m) => m.id === id);
  if (!moduloAtual) return;
  for (const b of abas.children) b.setAttribute("aria-selected", String(b.id === `aba-${id}`));
  limpar(painel);

  const podeCriar = !moduloAtual.somenteModerar && pode(moduloAtual.id, "criar");
  const podeEditar = !moduloAtual.somenteModerar && pode(moduloAtual.id, "editar");
  const podeExcluir = pode(moduloAtual.id, "excluir");
  const temFormulario = podeCriar || podeEditar;

  const lista = h("div", { class: "admin-lista", "aria-live": "polite" });
  const colunaForm = h("div", { class: "painel", hidden: !podeCriar });
  const layout = h("div", { class: `admin-layout ${!podeCriar ? "admin-layout-unico" : ""}`.trim() },
    h("div", {}, h("h2", { text: moduloAtual.rotulo }), lista),
    temFormulario ? colunaForm : null);
  painel.append(layout);
  mostrarCarregando(lista, 3);

  let contexto = { atracoes: [] };
  try {
    if (temFormulario) contexto = { atracoes: (await api.get("/atracoes")).atracoes };
  } catch (erro) { mostrarErro(lista, erro); return; }

  let editandoId = null;
  const titulo = h("h2", { text: moduloAtual.tituloNovo });
  const formulario = !temFormulario ? null : criarFormulario({
    prefixo: moduloAtual.id,
    rotulo: "Salvar",
    campos: moduloAtual.campos(contexto),
    aoCancelar: () => iniciarNovo(),
    async aoEnviar(valores) {
      try {
        if (editandoId) {
          await api.admin.put(`${moduloAtual.endpoint}/${editandoId}`, valores);
          toast("Alterações salvas.");
        } else {
          await api.admin.post(moduloAtual.endpoint, moduloAtual.aoCriar ? moduloAtual.aoCriar(valores) : valores);
          toast(moduloAtual.id === "noticias" ? "Notícia publicada com sucesso." : "Cadastro realizado com sucesso.");
        }
      } catch (erro) {
        if (tratarErroAuth(erro)) return;
        throw erro;
      }
      iniciarNovo();
      carregarLista();
    },
  });

  function iniciarNovo() {
    editandoId = null;
    titulo.textContent = moduloAtual.tituloNovo;
    formulario?.preencher(null);
    if (!podeCriar && colunaForm) {
      colunaForm.hidden = true;
      layout.classList.add("admin-layout-unico");
    }
  }

  function iniciarEdicao(item) {
    editandoId = item.id;
    titulo.textContent = moduloAtual.tituloEditar;
    if (colunaForm) {
      colunaForm.hidden = false;
      layout.classList.remove("admin-layout-unico");
    }
    formulario.preencher(item);
    colunaForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (formulario) {
    colunaForm.append(titulo, formulario.form);
    iniciarNovo();
  }

  async function carregarLista() {
    mostrarCarregando(lista, 2);
    try {
      const dados = await api.get(moduloAtual.endpoint, { limite: moduloAtual.limite, ...(moduloAtual.params || {}) });
      const itens = dados[moduloAtual.chave];
      if (!itens.length) return mostrarVazio(lista, "Nada cadastrado ainda.");
      limpar(lista);
      lista.removeAttribute("aria-busy");
      lista.append(...itens.map((item) => linhaItem(item)));
    } catch (erro) {
      mostrarErro(lista, erro, carregarLista);
    }
    return undefined;
  }

  function linhaItem(item) {
    const m = moduloAtual;
    return h("div", { class: "admin-item" },
      m.imagem && item[m.imagem] ? h("img", { src: item[m.imagem], alt: "", loading: "lazy" }) : null,
      h("div", { class: "info" }, h("strong", { text: m.titulo(item) }), h("span", { text: m.detalhe(item) })),
      m.selo ? m.selo(item) : null,
      h("div", { class: "acoes" },
        podeEditar ? h("button", { class: "btn btn-secundario btn-pequeno", type: "button", text: "Editar", onclick: () => iniciarEdicao(item) }) : null,
        podeExcluir ? h("button", { class: "btn btn-perigo btn-pequeno", type: "button", text: m.somenteModerar ? "Remover" : "Excluir", onclick: () => excluir(item) }) : null));
  }

  async function excluir(item) {
    if (!(await confirmar(`Excluir "${moduloAtual.titulo(item)}"? Esta ação não pode ser desfeita.`))) return;
    try {
      await api.admin.del(`${moduloAtual.endpoint}/${item.id}`);
      toast("Item excluído.");
      if (editandoId === item.id) iniciarNovo();
      carregarLista();
    } catch (erro) {
      if (!tratarErroAuth(erro)) toast(erro.message, "erro");
    }
  }

  carregarLista();
}

async function inicializar() {
  try {
    const { usuario } = await api.get("/auth/eu");
    if (usuario) {
      usuarioLogado = usuario;
      sessao.salvar(sessao.token(), usuario);
    }
  } catch (erro) {
    if (tratarErroAuth(erro)) return;
  }

  document.getElementById("usuario-nome").textContent = usuarioLogado?.nome || usuarioLogado?.email || "";
  if (pode("usuarios", "ler")) {
    document.getElementById("nav-item-usuarios").hidden = false;
  }

  limpar(abas);
  const visiveis = MODULOS.filter((m) => pode(m.id, "ler"));
  if (!visiveis.length) {
    mostrarVazio(painel, "Sua conta não possui módulos habilitados para leitura. Solicite acesso ao administrador.");
    return;
  }
  visiveis.forEach((m) => {
    abas.append(h("button", { type: "button", role: "tab", id: `aba-${m.id}`, "aria-selected": "false", text: m.rotulo, onclick: () => abrir(m.id) }));
  });
  abrir(visiveis[0].id);
}

inicializar();
