import "../layout.js";
import { api } from "../api.js";
import { mostrarCarregando, mostrarErro, renderizarLista, controlesPaginacao } from "../ui.js";
import { cardNoticia, miniEvento, cardAtracao } from "../componentes/cards.js";

const lista = document.getElementById("lista-noticias");
const paginacao = document.getElementById("paginacao-noticias");
const LIMITE = 7;

async function carregarNoticias(pagina = 1) {
  mostrarCarregando(lista, 3);
  try {
    const dados = await api.get("/noticias", { limite: LIMITE, pagina });
    // Na primeira pagina a noticia mais recente aparece em destaque.
    renderizarLista(lista, dados.noticias, (n) => cardNoticia(n, { destaque: pagina === 1 && n === dados.noticias[0] }),
      "Nenhuma notícia publicada ainda.");
    controlesPaginacao(paginacao, dados, (p) => { carregarNoticias(p); lista.scrollIntoView({ behavior: "smooth" }); });
  } catch (erro) {
    mostrarErro(lista, erro, () => carregarNoticias(pagina));
  }
}

async function carregarProximos() {
  const alvo = document.getElementById("lista-proximos");
  mostrarCarregando(alvo, 2);
  try {
    const dados = await api.get("/eventos", { limite: 4 });
    renderizarLista(alvo, dados.eventos, miniEvento, "Nenhum evento programado.");
  } catch (erro) {
    mostrarErro(alvo, erro, carregarProximos);
  }
}

async function carregarAtracoes() {
  const alvo = document.getElementById("lista-atracoes");
  mostrarCarregando(alvo, 3);
  try {
    const dados = await api.get("/atracoes");
    renderizarLista(alvo, dados.atracoes, cardAtracao, "Nenhuma atração cadastrada.");
  } catch (erro) {
    mostrarErro(alvo, erro, carregarAtracoes);
  }
}

carregarNoticias();
carregarProximos();
carregarAtracoes();
