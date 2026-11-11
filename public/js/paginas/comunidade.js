import "../layout.js";
import { api } from "../api.js";
import { h, mostrarCarregando, mostrarErro, renderizarLista, controlesPaginacao, toast, opcoesSelect } from "../ui.js";
import { itemRelato } from "../componentes/cards.js";
import { criarFormulario } from "../formulario.js";

const lista = document.getElementById("lista");
const paginacao = document.getElementById("paginacao");
let formulario;
let bioPorAtracao = [];

async function carregar(pagina = 1) {
  mostrarCarregando(lista, 3);
  try {
    const dados = await api.get("/relatos", { limite: 10, pagina });
    renderizarLista(lista, dados.relatos, itemRelato, "Ainda não há relatos. Seja o primeiro!");
    controlesPaginacao(paginacao, dados, carregar);
  } catch (erro) {
    mostrarErro(lista, erro, () => carregar(pagina));
  }
}

async function montarFormulario() {
  const area = document.getElementById("area-form");
  let atracoes = [];
  try {
    atracoes = (await api.get("/atracoes")).atracoes;
  } catch (erro) {
    area.append(h("p", { class: "estado estado-erro", text: erro.message }));
    return;
  }

  formulario = criarFormulario({
    prefixo: "relato",
    rotulo: "Publicar relato",
    campos: [
      { nome: "nome", rotulo: "Seu nome", obrigatorio: true, min: 2, max: 60, autocomplete: "name" },
      { nome: "atracao_id", rotulo: "Atração visitada", tipo: "select", obrigatorio: true, opcoes: atracoes.map((a) => ({ valor: a.id, texto: a.nome })) },
      { nome: "biodiversidade_id", rotulo: "Local específico (opcional)", tipo: "select", opcoes: [{ valor: "", texto: "Nenhum" }] },
      { nome: "texto", rotulo: "Sua experiência", tipo: "textarea", obrigatorio: true, min: 10, max: 500, ajuda: "Entre 10 e 500 caracteres." },
    ],
    async aoEnviar(valores) {
      await api.post("/relatos", {
        nome: valores.nome, atracao_id: Number(valores.atracao_id), texto: valores.texto,
        biodiversidade_id: valores.biodiversidade_id ? Number(valores.biodiversidade_id) : undefined,
      });
      toast("Relato publicado. Obrigado por compartilhar!");
      formulario.preencher(null);
      atualizarLocais();
      carregar(1);
    },
  });
  area.append(formulario.form);

  const selAtracao = formulario.form.querySelector('[name="atracao_id"]');
  const selBio = formulario.form.querySelector('[name="biodiversidade_id"]');
  async function atualizarLocais() {
    try {
      bioPorAtracao = (await api.get("/biodiversidade", { atracao_id: selAtracao.value, limite: 50 })).biodiversidade;
    } catch { bioPorAtracao = []; }
    opcoesSelect(selBio, bioPorAtracao, { vazio: "Nenhum" });
  }
  selAtracao.addEventListener("change", atualizarLocais);
  atualizarLocais();
}

carregar();
montarFormulario();
