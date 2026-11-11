// Componentes de card (um por modulo). Cada um recebe o objeto vindo da API e devolve um elemento.
import { h, imagemCard, selo, seloCondicao, formatarPeriodo, formatarHora, formatarDataHora } from "../ui.js";

export function cardNoticia(n, { destaque = false } = {}) {
  return h("article", { class: `card ${destaque ? "card-destaque" : ""}`.trim() },
    imagemCard(n.imagem_url, n.titulo),
    h("div", { class: "card-corpo" },
      h("span", { class: "card-meta", text: formatarDataHora(n.criado_em) }),
      h(destaque ? "h2" : "h3", { text: n.titulo }),
      h("p", { text: destaque ? n.conteudo.slice(0, 380) + (n.conteudo.length > 380 ? "…" : "") : (n.resumo || n.conteudo.slice(0, 140)) })));
}

function selosFuncionamento(item) {
  return h("div", { class: "selos" },
    selo(item.gratuito ? "Gratuito" : "Pago", item.gratuito ? "ok" : "aviso"),
    selo(item.permanencia),
    item.condicao ? seloCondicao(item.condicao) : null);
}

export function cardBiodiversidade(b) {
  return h("article", { class: "card" },
    imagemCard(b.imagem_url, b.nome),
    h("div", { class: "card-corpo" },
      h("div", { class: "selos" }, selo(b.categoria), b.dificuldade ? selo(b.dificuldade) : null),
      h("h3", { text: b.nome }),
      h("p", { text: b.descricao }),
      h("ul", { class: "card-lista" },
        h("li", {}, h("strong", { text: "Atração: " }), b.atracao_nome),
        h("li", {}, h("strong", { text: "Local: " }), b.localizacao),
        b.distancia_km ? h("li", {}, h("strong", { text: "Distância: " }), `${String(b.distancia_km).replace(".", ",")} km`) : null,
        b.duracao ? h("li", {}, h("strong", { text: "Tempo estimado: " }), b.duracao) : null,
        b.funcionamento ? h("li", {}, h("strong", { text: "Funcionamento: " }), b.funcionamento) : null,
        b.recomendacoes ? h("li", {}, h("strong", { text: "Recomendações: " }), b.recomendacoes) : null,
        b.dicas_seguranca ? h("li", {}, h("strong", { text: "Segurança: " }), b.dicas_seguranca) : null),
      selosFuncionamento(b)));
}

export function cardEvento(e) {
  const horaInicio = formatarHora(e.data_hora);
  return h("article", { class: "card" },
    imagemCard(e.imagem_url, e.titulo),
    h("div", { class: "card-corpo" },
      h("h3", { text: e.titulo }),
      h("ul", { class: "card-lista" },
        h("li", {}, h("strong", { text: "Data: " }), formatarPeriodo(e.data_hora, e.data_fim)),
        e.funcionamento || horaInicio ? h("li", {}, h("strong", { text: "Horário: " }), e.funcionamento || horaInicio) : null,
        h("li", {}, h("strong", { text: "Local: " }), e.local || e.atracao_nome)),
      e.descricao ? h("p", { text: e.descricao }) : null,
      selosFuncionamento({ ...e, condicao: null }),
      h("div", { class: "card-acoes" },
        h("a", { class: "btn btn-secundario btn-pequeno", href: `/atracao?id=${e.atracao_id}`, text: e.atracao_nome }),
        e.link ? h("a", { class: "btn btn-pequeno", href: e.link, target: "_blank", rel: "noopener noreferrer", text: "Mais informações" }) : null)));
}

export function miniEvento(e) {
  return h("div", { class: "mini-evento" },
    h("time", { text: formatarPeriodo(e.data_hora, e.data_fim) }),
    h("h3", { text: e.titulo }),
    h("span", { class: "card-meta", text: e.local || e.atracao_nome }));
}

export function cardGastronomia(g) {
  return h("article", { class: "card" },
    imagemCard(g.imagem_url, g.nome),
    h("div", { class: "card-corpo" },
      selo(g.tipo),
      h("h3", { text: g.nome }),
      h("p", { text: g.descricao }),
      h("ul", { class: "card-lista" },
        h("li", {}, h("strong", { text: "Localização: " }), g.endereco),
        g.funcionamento ? h("li", {}, h("strong", { text: "Funcionamento: " }), g.funcionamento) : null,
        g.telefone ? h("li", {}, h("strong", { text: "Contato: " }), g.telefone) : null)));
}

export function cardAtracao(a) {
  return h("article", { class: "card" },
    imagemCard(a.imagem_url, a.nome),
    h("div", { class: "card-corpo" },
      h("div", { class: "selos" }, selo(a.categoria), seloCondicao(a.condicao)),
      h("h3", { text: a.nome }),
      h("p", { text: a.descricao }),
      h("span", { class: "card-meta", text: `Horários: ${a.horarios}` }),
      h("div", { class: "card-acoes" },
        h("a", { class: "btn btn-pequeno", href: `/atracao?id=${a.id}`, text: "Explorar" }))));
}

export function itemRelato(r) {
  return h("article", { class: "relato" },
    h("header", {},
      h("strong", { text: r.nome }),
      h("span", { text: [r.biodiversidade_nome || r.atracao_nome, formatarDataHora(r.criado_em)].filter(Boolean).join(" · ") })),
    h("p", { text: r.texto }));
}
