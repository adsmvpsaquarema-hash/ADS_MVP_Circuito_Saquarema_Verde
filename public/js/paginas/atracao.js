import "../layout.js";
import { api } from "../api.js";
import { h, mostrarCarregando, mostrarErro, seloCondicao, selo, imagemCard, limpar, formatarDataHora } from "../ui.js";
import { cardBiodiversidade, cardEvento, itemRelato } from "../componentes/cards.js";

const container = document.getElementById("detalhe");

function secao(titulo, itens, criar, vazio, link) {
  return h("section", { class: "secao" },
    h("div", { class: "secao-cabecalho" }, h("h2", { text: titulo }), link),
    itens.length ? h("div", { class: "grade" }, itens.map(criar)) : h("div", { class: "estado", text: vazio }));
}

async function carregar() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return mostrarErro(container, new Error("Atração não informada."));
  mostrarCarregando(container, 1);
  try {
    const a = await api.get(`/atracoes/${encodeURIComponent(id)}`);
    document.title = `${a.nome} - Saquarema Verde Online`;
    limpar(container);
    container.removeAttribute("aria-busy");
    container.append(
      a.imagem_url ? h("img", { class: "detalhe-capa", src: a.imagem_url, alt: a.nome }) : null,
      h("div", { class: "detalhe-info secao" },
        h("div", { class: "selos" }, selo(a.categoria), seloCondicao(a.condicao)),
        h("h1", { text: a.nome }),
        h("p", { text: a.descricao }),
        h("p", {}, h("strong", { text: "Local: " }), a.localizacao),
        h("p", {}, h("strong", { text: "Horários: " }), a.horarios),
        a.regras_visitacao ? h("div", { class: "bloco-regras" }, h("strong", { text: "Regras de visitação: " }), a.regras_visitacao) : null),
      secao("Biodiversidade", a.biodiversidade, cardBiodiversidade, "Nenhum item de biodiversidade cadastrado nesta atração."),
      secao("Eventos", a.eventos, cardEvento, "Nenhum evento cadastrado nesta atração."),
      h("section", { class: "secao" },
        h("div", { class: "secao-cabecalho" }, h("h2", { text: "Relatos recentes" }),
          h("a", { href: "/comunidade", text: "Compartilhar experiência" })),
        a.relatos.length
          ? h("div", { class: "lista-vertical" }, a.relatos.map((r) => itemRelato({ ...r, atracao_nome: "" })))
          : h("div", { class: "estado", text: "Ainda não há relatos." })));
  } catch (erro) {
    mostrarErro(container, erro.status === 404 ? new Error("Atração não encontrada.") : erro, carregar);
  }
}

carregar();
