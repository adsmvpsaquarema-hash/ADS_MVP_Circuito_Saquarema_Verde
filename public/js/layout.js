// Cabecalho e rodape compartilhados (uma unica definicao para todas as paginas).
import { h } from "./ui.js";
import { sessao } from "./api.js";

const LINKS = [
  { href: "/", texto: "Notícias", ids: ["index", ""] },
  { href: "/biodiversidade", texto: "Biodiversidade", ids: ["biodiversidade", "atracao"] },
  { href: "/eventos", texto: "Eventos", ids: ["eventos"] },
  { href: "/gastronomia", texto: "Gastronomia", ids: ["gastronomia"] },
  { href: "/comunidade", texto: "Comunidade", ids: ["comunidade"] },
];

function paginaAtual() {
  const nome = location.pathname.split("/").pop().replace(/\.html$/, "");
  return nome;
}

export function montarLayout() {
  const atual = paginaAtual();
  const logado = Boolean(sessao.token());

  const lista = h("ul", { class: "nav-lista", id: "menu-principal" },
    ...LINKS.map((l) => h("li", {}, h("a", { href: l.href, text: l.texto, "aria-current": l.ids.includes(atual) ? "page" : undefined }))),
    h("li", {}, h("a", { class: "nav-login", href: logado ? "/admin" : "/login", text: logado ? "Painel" : "Login" })));

  const toggle = h("button", {
    class: "nav-toggle", type: "button", "aria-expanded": "false", "aria-controls": "menu-principal", "aria-label": "Abrir menu", text: "☰",
  });
  toggle.addEventListener("click", () => {
    const aberto = lista.classList.toggle("aberto");
    toggle.setAttribute("aria-expanded", String(aberto));
  });

  const header = document.getElementById("site-header");
  if (header) {
    header.className = "site-header";
    header.replaceChildren(h("div", { class: "container" },
      h("a", { class: "logo", href: "/", "aria-label": "Saquarema Verde Online - início" },
        h("img", { src: "/assets/logo4.png", alt: "Logo Circuito Verde Saquarema" })),
      toggle,
      h("nav", { "aria-label": "Principal" }, lista)));
  }

  const footer = document.getElementById("site-footer");
  if (footer) {
    footer.className = "site-footer";
    footer.id = "contato";
    footer.replaceChildren(h("div", { class: "container" },
      h("div", {},
        h("h3", { text: "Saquarema Verde Online" }),
        h("p", { text: "Ecoturismo, biodiversidade e cultura de Saquarema em um só lugar." })),
      h("div", {},
        h("h3", { text: "Contato" }),
        h("p", {}, h("a", { href: "mailto:adsmvpsaquarema@gmail.com", text: "adsmvpsaquarema@gmail.com" })),
        h("p", {}, h("a", { href: "tel:+552299999999", text: "(22) 99999-9999" })))));
  }
}

montarLayout();
