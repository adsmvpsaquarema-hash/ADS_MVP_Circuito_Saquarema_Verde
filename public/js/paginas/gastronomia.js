import "../layout.js";
import { api } from "../api.js";
import { mostrarCarregando, mostrarErro, renderizarLista, controlesPaginacao } from "../ui.js";
import { cardGastronomia } from "../componentes/cards.js";

const lista = document.getElementById("lista");
const paginacao = document.getElementById("paginacao");

async function carregar(pagina = 1) {
  mostrarCarregando(lista, 3);
  try {
    const dados = await api.get("/gastronomia", { limite: 12, pagina });
    renderizarLista(lista, dados.gastronomia, cardGastronomia, "Nenhum estabelecimento cadastrado.");
    controlesPaginacao(paginacao, dados, carregar);
  } catch (erro) {
    mostrarErro(lista, erro, () => carregar(pagina));
  }
}

carregar();
