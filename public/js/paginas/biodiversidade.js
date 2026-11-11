import "../layout.js";
import { api } from "../api.js";
import { mostrarCarregando, mostrarErro, renderizarLista, controlesPaginacao, opcoesSelect } from "../ui.js";
import { cardBiodiversidade } from "../componentes/cards.js";

const lista = document.getElementById("lista");
const paginacao = document.getElementById("paginacao");
const q = document.getElementById("f-q");
const categoria = document.getElementById("f-categoria");
const atracao = document.getElementById("f-atracao");
const LIMITE = 12;

async function carregar(pagina = 1) {
  mostrarCarregando(lista, 3);
  try {
    const dados = await api.get("/biodiversidade", {
      q: q.value.trim(), categoria: categoria.value, atracao_id: atracao.value, limite: LIMITE, pagina,
    });
    renderizarLista(lista, dados.biodiversidade, cardBiodiversidade, "Nenhum item encontrado para esse filtro.");
    controlesPaginacao(paginacao, dados, carregar);
  } catch (erro) {
    mostrarErro(lista, erro, () => carregar(pagina));
  }
}

let timer;
q.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => carregar(1), 300); });
categoria.addEventListener("change", () => carregar(1));
atracao.addEventListener("change", () => carregar(1));
document.getElementById("filtros").addEventListener("submit", (e) => { e.preventDefault(); carregar(1); });

(async () => {
  try {
    const { atracoes } = await api.get("/atracoes");
    opcoesSelect(atracao, atracoes, { vazio: "Todas" });
  } catch { /* o filtro continua funcionando sem a lista de atracoes */ }
  const inicial = new URLSearchParams(location.search).get("atracao_id");
  if (inicial) atracao.value = inicial;
  carregar(1);
})();
