// Utilitarios de interface. Todo conteudo dinamico usa textContent (nunca innerHTML) para evitar XSS.

// Cria elementos de forma segura: h("div", { class: "x", text: "oi" }, filho1, filho2)
export function h(tag, props = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [chave, valor] of Object.entries(props)) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (chave === "class") el.className = valor;
    else if (chave === "text") el.textContent = valor;
    else if (chave.startsWith("on") && typeof valor === "function") el.addEventListener(chave.slice(2), valor);
    else if (valor === true) el.setAttribute(chave, "");
    else el.setAttribute(chave, valor);
  }
  for (const f of filhos.flat()) {
    if (f === undefined || f === null || f === false) continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return el;
}

export function limpar(el) { el.replaceChildren(); }

// ---- Toasts ----
function areaToasts() {
  let area = document.getElementById("toasts");
  if (!area) {
    area = h("div", { id: "toasts", class: "toasts", role: "status", "aria-live": "polite" });
    document.body.append(area);
  }
  return area;
}

export function toast(mensagem, tipo = "ok") {
  const t = h("div", { class: `toast toast-${tipo}`, text: mensagem });
  areaToasts().append(t);
  setTimeout(() => t.remove(), tipo === "erro" ? 6000 : 3500);
}

// ---- Estados de lista ----
export function mostrarCarregando(container, quantidade = 3) {
  limpar(container);
  for (let i = 0; i < quantidade; i += 1) container.append(h("div", { class: "skeleton", "aria-hidden": "true" }));
  container.setAttribute("aria-busy", "true");
}

export function mostrarVazio(container, texto) {
  limpar(container);
  container.removeAttribute("aria-busy");
  container.append(h("div", { class: "estado", text: texto }));
}

export function mostrarErro(container, erro, aoTentarNovamente) {
  limpar(container);
  container.removeAttribute("aria-busy");
  container.append(h("div", { class: "estado estado-erro", role: "alert" },
    h("p", { text: erro?.message || "Não foi possível carregar os dados." }),
    aoTentarNovamente ? h("button", { class: "btn btn-secundario btn-pequeno", type: "button", text: "Tentar novamente", onclick: aoTentarNovamente }) : null));
}

// Renderiza uma lista (ou estado vazio) e remove o aria-busy.
export function renderizarLista(container, itens, criarItem, textoVazio) {
  container.removeAttribute("aria-busy");
  if (!itens.length) return mostrarVazio(container, textoVazio);
  limpar(container);
  container.append(...itens.map(criarItem));
  return undefined;
}

// ---- Formatadores ----
function paraData(valor) {
  if (!valor) return null;
  const d = new Date(String(valor).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatarData(valor) {
  const d = paraData(valor);
  return d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "Data a confirmar";
}

export function formatarDataHora(valor) {
  const d = paraData(valor);
  if (!d) return "Data a confirmar";
  const temHora = String(valor).length > 10;
  return temHora ? d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : formatarData(valor);
}

export function formatarPeriodo(inicio, fim) {
  if (!fim || fim.slice(0, 10) === inicio.slice(0, 10)) return formatarData(inicio);
  const a = paraData(inicio);
  const b = paraData(fim);
  if (!a || !b) return formatarData(inicio);
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()} a ${b.getDate()} de ${a.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`;
  }
  return `${formatarData(inicio)} a ${formatarData(fim)}`;
}

export function formatarHora(valor) {
  return valor && String(valor).length >= 16 ? String(valor).slice(11, 16) : "";
}

// ---- Selos ----
export function selo(texto, tipo = "") {
  return h("span", { class: `selo ${tipo ? `selo-${tipo}` : ""}`.trim(), text: texto });
}

export function seloCondicao(condicao) {
  const tipo = condicao === "Aberta" ? "ok" : condicao === "Fechada" ? "erro" : "aviso";
  return selo(condicao, tipo);
}

// ---- Confirmacao (substitui window.confirm) ----
export function confirmar(mensagem) {
  return new Promise((resolve) => {
    const dialogo = h("dialog", { class: "dialogo-confirma", "aria-label": "Confirmação" },
      h("p", { text: mensagem }),
      h("div", { class: "acoes" },
        h("button", { class: "btn btn-secundario btn-pequeno", type: "button", text: "Cancelar", onclick: () => dialogo.close("nao") }),
        h("button", { class: "btn btn-perigo btn-pequeno", type: "button", text: "Excluir", onclick: () => dialogo.close("sim") })));
    dialogo.addEventListener("close", () => { resolve(dialogo.returnValue === "sim"); dialogo.remove(); });
    document.body.append(dialogo);
    dialogo.showModal();
  });
}

export function imagemCard(url, alt) {
  return url
    ? h("img", { class: "card-imagem", src: url, alt: alt || "", loading: "lazy" })
    : h("div", { class: "card-imagem", role: "img", "aria-label": "Sem imagem" });
}

// Controles "Anterior / Proxima" para listas paginadas.
export function controlesPaginacao(container, { total, pagina, limite }, aoMudar) {
  limpar(container);
  const paginas = Math.max(Math.ceil(total / limite), 1);
  if (paginas <= 1) return;
  container.append(
    h("button", { class: "btn btn-secundario btn-pequeno", type: "button", text: "Anterior", disabled: pagina <= 1, onclick: () => aoMudar(pagina - 1) }),
    h("span", { text: `Página ${pagina} de ${paginas}` }),
    h("button", { class: "btn btn-secundario btn-pequeno", type: "button", text: "Próxima", disabled: pagina >= paginas, onclick: () => aoMudar(pagina + 1) }));
}

// Preenche um <select> com as atracoes da API (opcao inicial opcional).
export function opcoesSelect(select, itens, { vazio, valor = "id", texto = "nome" } = {}) {
  limpar(select);
  if (vazio) select.append(h("option", { value: "", text: vazio }));
  for (const item of itens) select.append(h("option", { value: item[valor], text: item[texto] }));
}
