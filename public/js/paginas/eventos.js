import "../layout.js";
import { api } from "../api.js";
import { mostrarCarregando, mostrarErro, renderizarLista, controlesPaginacao, opcoesSelect } from "../ui.js";
import { cardEvento } from "../componentes/cards.js";

const lista = document.getElementById("lista");
const paginacao = document.getElementById("paginacao");
const atracao = document.getElementById("f-atracao");
const todos = document.getElementById("f-todos");
const LIMITE = 12;

async function carregar(pagina = 1) {
  mostrarCarregando(lista, 3);
  try {
    const dados = await api.get("/eventos", {
      atracao_id: atracao.value, todos: todos.checked ? 1 : undefined, limite: LIMITE, pagina,
    });
    renderizarLista(lista, dados.eventos, cardEvento, "Nenhum evento programado.");
    controlesPaginacao(paginacao, dados, carregar);
  } catch (erro) {
    mostrarErro(lista, erro, () => carregar(pagina));
  }
}

atracao.addEventListener("change", () => carregar(1));
todos.addEventListener("change", () => carregar(1));

(async () => {
  try {
    const { atracoes } = await api.get("/atracoes");
    opcoesSelect(atracao, atracoes, { vazio: "Todas" });
  } catch { /* filtro opcional */ }
  carregar(1);
})();
