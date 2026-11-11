import { api, sessao } from "../api.js";
import { h, limpar, toast, confirmar, mostrarCarregando, mostrarErro, mostrarVazio, selo } from "../ui.js";
import { validarValor, mostrarErroCampo } from "../validacao.js";
import "../layout.js";

if (!sessao.token()) location.replace("/login");

document.getElementById("sair").addEventListener("click", () => { sessao.limpar(); location.href = "/login"; });

const MODULOS_LISTA = [
  { id: "noticias", rotulo: "Notícias" },
  { id: "biodiversidade", rotulo: "Biodiversidade" },
  { id: "eventos", rotulo: "Eventos" },
  { id: "atracoes", rotulo: "Atrações" },
  { id: "gastronomia", rotulo: "Gastronomia" },
  { id: "relatos", rotulo: "Relatos (Comunidade)" },
  { id: "usuarios", rotulo: "Usuários (Controle)" },
];

const ACOES_LISTA = [
  { id: "ler", rotulo: "Ler" },
  { id: "criar", rotulo: "Cadastrar" },
  { id: "editar", rotulo: "Editar" },
  { id: "excluir", rotulo: "Excluir" },
];

const ROTULOS_PAPEL = {
  admin: "Administrador",
  gestor: "Gestor",
  colaborador: "Colaborador",
  personalizado: "Personalizado",
};

const painel = document.getElementById("painel-usuarios");
let perfisPadrao = {};
let usuarioLogado = sessao.usuario();

function seloPapel(papel) {
  const tipo = papel === "admin" ? "ok" : papel === "gestor" ? "aviso" : "";
  return selo(ROTULOS_PAPEL[papel] || papel, tipo);
}

function resumirPermissoes(u) {
  if (u.papel === "admin") return "Acesso total (ler, cadastrar, editar e excluir em todos os módulos)";
  const partes = [];
  for (const m of MODULOS_LISTA) {
    const p = u.permissoes?.[m.id];
    if (!p) continue;
    const acoes = ACOES_LISTA.filter((a) => p[a.id]).map((a) => a.rotulo);
    if (acoes.length) partes.push(`${m.rotulo}: ${acoes.join("/")}`);
  }
  return partes.length ? partes.join(" · ") : "Sem permissões ativas";
}

async function inicializar() {
  try {
    const { usuario } = await api.get("/auth/eu");
    if (usuario) {
      usuarioLogado = usuario;
      sessao.salvar(sessao.token(), usuario);
    }
  } catch (erro) {
    if (erro.status === 401) {
      sessao.limpar();
      location.replace("/login");
      return;
    }
  }

  document.getElementById("usuario-nome").textContent = usuarioLogado?.nome || usuarioLogado?.email || "";

  const podeCriar = usuarioLogado.papel === "admin" || Boolean(usuarioLogado.permissoes?.usuarios?.criar);
  const podeEditar = usuarioLogado.papel === "admin" || Boolean(usuarioLogado.permissoes?.usuarios?.editar);
  const podeExcluir = usuarioLogado.papel === "admin" || Boolean(usuarioLogado.permissoes?.usuarios?.excluir);

  const lista = h("div", { class: "admin-lista", "aria-live": "polite" });
  const colunaForm = h("div", { class: "painel", hidden: !podeCriar });
  const layout = h("div", { class: `admin-layout ${!podeCriar ? "admin-layout-unico" : ""}`.trim() },
    h("div", {}, h("h2", { text: "Usuários cadastrados" }), lista),
    (podeCriar || podeEditar) ? colunaForm : null);
  limpar(painel);
  painel.append(layout);

  // Construcao do formulario com matriz de checkboxes por modulo
  let editandoId = null;
  const tituloForm = h("h2", { text: "Cadastrar novo usuário" });

  const inNome = h("input", { id: "u-nome", name: "nome", type: "text", maxlength: 100, autocomplete: "off" });
  const inEmail = h("input", { id: "u-email", name: "email", type: "email", maxlength: 120, autocomplete: "off" });
  const inSenha = h("input", { id: "u-senha", name: "senha", type: "password", maxlength: 100, autocomplete: "new-password" });
  const ajudaSenha = h("div", { class: "ajuda", id: "ajuda-u-senha", text: "Mínimo de 6 caracteres." });
  const selPapel = h("select", { id: "u-papel", name: "papel" },
    h("option", { value: "colaborador", text: "Colaborador (lê, cadastra e edita conteúdos)" }),
    h("option", { value: "gestor", text: "Gestor (gerencia todos os conteúdos, exceto usuários)" }),
    h("option", { value: "admin", text: "Administrador (acesso total + gestão de usuários)" }),
    h("option", { value: "personalizado", text: "Personalizado (definido na tabela abaixo)" }));

  // Mapa de checkboxes: checkboxes[modulo][acao]
  const checkboxes = {};
  const linhasTabela = MODULOS_LISTA.map((m) => {
    checkboxes[m.id] = {};
    const celulas = ACOES_LISTA.map((a) => {
      const cb = h("input", {
        type: "checkbox",
        "aria-label": `${a.rotulo} em ${m.rotulo}`,
        onchange: () => aoMarcarCheckbox(m.id, a.id),
      });
      checkboxes[m.id][a.id] = cb;
      return h("td", {}, cb);
    });
    return h("tr", {}, h("td", { text: m.rotulo }), ...celulas);
  });

  function aplicarPerfilNaTabela(papel, matrizExplicita = null) {
    const base = matrizExplicita || perfisPadrao[papel] || {};
    const ehAdmin = papel === "admin";
    for (const m of MODULOS_LISTA) {
      for (const a of ACOES_LISTA) {
        const cb = checkboxes[m.id][a.id];
        cb.checked = ehAdmin ? true : Boolean(base?.[m.id]?.[a.id]);
        cb.disabled = ehAdmin;
      }
    }
  }

  function aoMarcarCheckbox(modId, acaoId) {
    const m = checkboxes[modId];
    // Se marcou criar/editar/excluir, garante ler marcado
    if (acaoId !== "ler" && m[acaoId].checked) {
      m.ler.checked = true;
    }
    // Se desmarcou ler, desmarca criar/editar/excluir daquele modulo
    if (acaoId === "ler" && !m.ler.checked) {
      m.criar.checked = false;
      m.editar.checked = false;
      m.excluir.checked = false;
    }
    if (selPapel.value !== "admin") {
      selPapel.value = "personalizado";
    }
  }

  selPapel.addEventListener("change", () => {
    if (selPapel.value !== "personalizado") {
      aplicarPerfilNaTabela(selPapel.value);
    } else {
      for (const m of MODULOS_LISTA) {
        for (const a of ACOES_LISTA) checkboxes[m.id][a.id].disabled = false;
      }
    }
  });

  function lerMatrizTabela() {
    const res = {};
    for (const m of MODULOS_LISTA) {
      res[m.id] = {
        ler: checkboxes[m.id].ler.checked,
        criar: checkboxes[m.id].criar.checked,
        editar: checkboxes[m.id].editar.checked,
        excluir: checkboxes[m.id].excluir.checked,
      };
    }
    return res;
  }

  function blocoCampo(id, rotulo, inputEl, ajudaEl = null) {
    return h("div", { class: "campo" },
      h("label", { for: id, text: rotulo }),
      inputEl,
      ajudaEl,
      h("div", { class: "erro", id: `erro-${id}`, role: "alert" }));
  }

  const btnSalvar = h("button", { class: "btn", type: "submit", text: "Salvar usuário" });
  const btnCancelar = h("button", { class: "btn btn-secundario", type: "button", text: "Cancelar", onclick: () => iniciarNovo() });

  const form = h("form", { class: "form", novalidate: true },
    blocoCampo("u-nome", "Nome completo *", inNome),
    blocoCampo("u-email", "E-mail *", inEmail),
    blocoCampo("u-senha", "Senha *", inSenha, ajudaSenha),
    blocoCampo("u-papel", "Nível / Tipo de usuário *", selPapel),
    h("fieldset", { class: "permissoes-bloco" },
      h("legend", { text: "Permissões por módulo (o que este usuário pode fazer)" }),
      h("table", { class: "tabela-permissoes" },
        h("thead", {},
          h("tr", {},
            h("th", { text: "Módulo" }),
            ...ACOES_LISTA.map((a) => h("th", { text: a.rotulo })))),
        h("tbody", {}, ...linhasTabela))),
    h("div", { class: "card-acoes" }, btnSalvar, btnCancelar));

  if (podeCriar || podeEditar) {
    colunaForm.append(tituloForm, form);
  }

  function iniciarNovo() {
    editandoId = null;
    tituloForm.textContent = "Cadastrar novo usuário";
    inNome.value = "";
    inEmail.value = "";
    inSenha.value = "";
    ajudaSenha.textContent = "Mínimo de 6 caracteres (obrigatória no cadastro).";
    selPapel.value = "colaborador";
    mostrarErroCampo(inNome, null);
    mostrarErroCampo(inEmail, null);
    mostrarErroCampo(inSenha, null);
    aplicarPerfilNaTabela("colaborador");
    if (!podeCriar) {
      colunaForm.hidden = true;
      layout.classList.add("admin-layout-unico");
    }
  }

  function iniciarEdicao(u) {
    editandoId = u.id;
    tituloForm.textContent = `Editar usuário: ${u.nome}`;
    inNome.value = u.nome;
    inEmail.value = u.email;
    inSenha.value = "";
    ajudaSenha.textContent = "Deixe em branco para manter a senha atual.";
    selPapel.value = u.papel;
    mostrarErroCampo(inNome, null);
    mostrarErroCampo(inEmail, null);
    mostrarErroCampo(inSenha, null);
    aplicarPerfilNaTabela(u.papel, u.permissoes);
    colunaForm.hidden = false;
    layout.classList.remove("admin-layout-unico");
    colunaForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errNome = validarValor(inNome.value, { rotulo: "Nome", obrigatorio: true, min: 3, max: 100 });
    const errEmail = validarValor(inEmail.value, { rotulo: "E-mail", tipo: "email", obrigatorio: true });
    const errSenha = validarValor(inSenha.value, { rotulo: "Senha", obrigatorio: !editandoId, min: 6, max: 100 });
    mostrarErroCampo(inNome, errNome);
    mostrarErroCampo(inEmail, errEmail);
    mostrarErroCampo(inSenha, errSenha);
    if (errNome || errEmail || errSenha) return;

    const payload = {
      nome: inNome.value.trim(),
      email: inEmail.value.trim(),
      papel: selPapel.value,
      permissoes: lerMatrizTabela(),
    };
    if (inSenha.value.trim()) payload.senha = inSenha.value.trim();

    btnSalvar.disabled = true;
    try {
      if (editandoId) {
        await api.admin.put(`/usuarios/${editandoId}`, payload);
        toast("Usuário atualizado com sucesso.");
      } else {
        await api.admin.post("/usuarios", payload);
        toast("Usuário cadastrado com sucesso.");
      }
      iniciarNovo();
      await carregarUsuarios();
    } catch (erro) {
      toast(erro.message, "erro");
    } finally {
      btnSalvar.disabled = false;
    }
  });

  async function carregarUsuarios() {
    mostrarCarregando(lista, 2);
    try {
      const dados = await api.get("/usuarios");
      perfisPadrao = dados.perfis_padrao || {};
      if (!editandoId) aplicarPerfilNaTabela(selPapel.value);
      const itens = dados.usuarios || [];
      if (!itens.length) return mostrarVazio(lista, "Nenhum usuário encontrado.");
      limpar(lista);
      lista.removeAttribute("aria-busy");
      lista.append(...itens.map((u) => h("div", { class: "admin-item" },
        h("div", { class: "info" },
          h("strong", { text: `${u.nome} (${u.email})` }),
          h("span", { text: resumirPermissoes(u), title: resumirPermissoes(u) })),
        seloPapel(u.papel),
        h("div", { class: "acoes" },
          podeEditar ? h("button", { class: "btn btn-secundario btn-pequeno", type: "button", text: "Editar", onclick: () => iniciarEdicao(u) }) : null,
          (podeExcluir && Number(u.id) !== Number(usuarioLogado.id))
            ? h("button", { class: "btn btn-perigo btn-pequeno", type: "button", text: "Excluir", onclick: () => excluirUsuario(u) })
            : null))));
    } catch (erro) {
      mostrarErro(lista, erro, carregarUsuarios);
    }
    return undefined;
  }

  async function excluirUsuario(u) {
    if (!(await confirmar(`Excluir o usuário "${u.nome}" (${u.email})?`))) return;
    try {
      await api.admin.del(`/usuarios/${u.id}`);
      toast("Usuário excluído.");
      if (editandoId === u.id) iniciarNovo();
      await carregarUsuarios();
    } catch (erro) {
      toast(erro.message, "erro");
    }
  }

  await carregarUsuarios();
}

inicializar();
