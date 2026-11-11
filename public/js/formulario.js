// Formulario declarativo: monta campos, valida, trata upload de imagem e erros do servidor.
import { h, toast } from "./ui.js";
import { validarValor, mostrarErroCampo } from "./validacao.js";
import { api } from "./api.js";

let contador = 0;
// Imagem ja enviada anteriormente (edicao) conta como valida na validacao do front.
const IMAGEM_OK = "image/png";

/**
 * campos: [{ nome, rotulo, tipo, obrigatorio, min, max, opcoes, ajuda, valorPadrao, linha }]
 * tipos: text | textarea | select | number | datetime-local | url | email | password | checkbox | imagem
 * opcoes de enviar: { rotulo, aoEnviar(valores) -> Promise, aoCancelar }
 * Retorna { form, preencher(obj), limpar(), valores() }
 */
export function criarFormulario({ campos, rotulo = "Salvar", aoEnviar, aoCancelar, prefixo = "f" }) {
  contador += 1;
  const id = (nome) => `${prefixo}${contador}-${nome}`;
  const entradas = new Map(); // nome -> { campo, el, previa, arquivo, imagemId }

  const form = h("form", { class: "form", novalidate: true });
  let linhaAtual = null;

  for (const campo of campos) {
    const entrada = construirCampo(campo, id(campo.nome));
    entradas.set(campo.nome, entrada);
    if (campo.linha) {
      if (!linhaAtual) { linhaAtual = h("div", { class: "linha-campos" }); form.append(linhaAtual); }
      linhaAtual.append(entrada.wrapper);
    } else {
      linhaAtual = null;
      form.append(entrada.wrapper);
    }
  }

  const botao = h("button", { class: "btn", type: "submit", text: rotulo });
  const acoes = h("div", { class: "card-acoes" }, botao,
    aoCancelar ? h("button", { class: "btn btn-secundario", type: "button", text: "Cancelar", onclick: () => aoCancelar() }) : null);
  form.append(acoes);

  function construirCampo(campo, idCampo) {
    const regra = { ...campo };
    let el;
    const wrapper = h("div", { class: campo.tipo === "checkbox" ? "campo campo-check" : "campo" });
    const erro = h("div", { class: "erro", id: `erro-${idCampo}`, role: "alert" });
    const ajuda = campo.ajuda ? h("div", { class: "ajuda", id: `ajuda-${idCampo}`, text: campo.ajuda }) : null;
    const descritoPor = [ajuda ? `ajuda-${idCampo}` : null, `erro-${idCampo}`].filter(Boolean).join(" ");
    const rotuloEl = h("label", { for: idCampo, text: campo.rotulo + (campo.obrigatorio ? " *" : "") });
    const entrada = { campo: regra, wrapper };

    if (campo.tipo === "textarea") {
      el = h("textarea", { id: idCampo, name: campo.nome, rows: campo.linhas || 4, maxlength: campo.max });
    } else if (campo.tipo === "select") {
      el = h("select", { id: idCampo, name: campo.nome },
        ...(campo.opcoes || []).map((o) => {
          const op = typeof o === "object" ? o : { valor: o, texto: o };
          return h("option", { value: op.valor, text: op.texto });
        }));
    } else if (campo.tipo === "checkbox") {
      el = h("input", { id: idCampo, name: campo.nome, type: "checkbox" });
      if (campo.valorPadrao) el.checked = true;
    } else if (campo.tipo === "imagem") {
      el = h("input", { id: idCampo, name: campo.nome, type: "file", accept: "image/jpeg,image/png,image/webp" });
      entrada.previa = h("img", { class: "previa", alt: "Pré-visualização da imagem", hidden: true });
      el.addEventListener("change", () => {
        entrada.arquivo = el.files[0] || null;
        const msg = validarValor(entrada.arquivo, regra);
        mostrarErroCampo(el, msg);
        if (!msg && entrada.arquivo) {
          entrada.previa.src = URL.createObjectURL(entrada.arquivo);
          entrada.previa.hidden = false;
        } else if (msg) {
          el.value = ""; entrada.arquivo = null; entrada.previa.hidden = true;
        }
      });
    } else {
      el = h("input", {
        id: idCampo, name: campo.nome, type: campo.tipo === "number" ? "text" : (campo.tipo || "text"),
        inputmode: campo.tipo === "number" ? "decimal" : undefined, maxlength: campo.max,
        autocomplete: campo.autocomplete || "off",
      });
    }
    if (campo.tipo !== "checkbox" && campo.tipo !== "imagem" && campo.valorPadrao !== undefined) el.value = campo.valorPadrao;
    el.setAttribute("aria-describedby", descritoPor);
    if (campo.obrigatorio) el.setAttribute("aria-required", "true");
    entrada.el = el;

    el.addEventListener("blur", () => { if (campo.tipo !== "imagem") mostrarErroCampo(el, validarValor(lerValor(entrada), regra)); });
    el.addEventListener("input", () => { if (el.getAttribute("aria-invalid")) mostrarErroCampo(el, validarValor(lerValor(entrada), regra)); });

    if (campo.tipo === "checkbox") wrapper.append(el, rotuloEl);
    else wrapper.append(rotuloEl, el);
    if (entrada.previa) wrapper.append(entrada.previa);
    if (campo.tipo === "imagem") {
      entrada.imagemAtual = h("div", { class: "ajuda" });
      wrapper.append(entrada.imagemAtual);
    }
    if (ajuda) wrapper.append(ajuda);
    wrapper.append(erro);
    return entrada;
  }

  function lerValor(entrada) {
    if (entrada.campo.tipo === "checkbox") return entrada.el.checked;
    if (entrada.campo.tipo === "imagem") return entrada.arquivo || (entrada.imagemId ? { type: IMAGEM_OK, size: 0 } : null);
    return entrada.el.value;
  }

  function validar() {
    let primeiroInvalido = null;
    for (const entrada of entradas.values()) {
      const msg = validarValor(lerValor(entrada), entrada.campo);
      mostrarErroCampo(entrada.el, msg);
      if (msg && !primeiroInvalido) primeiroInvalido = entrada.el;
    }
    if (primeiroInvalido) primeiroInvalido.focus();
    return !primeiroInvalido;
  }

  // Associa mensagens do servidor ao campo cujo nome aparece na mensagem; sobra vira toast.
  function aplicarErrosServidor(erro) {
    const mensagens = erro.erros?.length ? erro.erros : [erro.message];
    const sobras = [];
    for (const msg of mensagens) {
      let achou = false;
      for (const [nome, entrada] of entradas) {
        const nomeBase = nome.replace(/_id$/, "");
        if (new RegExp(`(^|[\\s:])${nomeBase}(_id)?([\\s.:]|$)`, "i").test(msg)) {
          mostrarErroCampo(entrada.el, msg);
          achou = true;
          break;
        }
      }
      if (!achou) sobras.push(msg);
    }
    if (sobras.length) toast(sobras.join(" "), "erro");
  }

  async function valores() {
    const v = {};
    for (const [nome, entrada] of entradas) {
      if (entrada.campo.tipo === "imagem") {
        if (entrada.arquivo) {
          const enviado = await api.admin.enviarImagem(entrada.arquivo);
          entrada.imagemId = enviado.id;
        }
        v[nome] = entrada.imagemId ?? null;
      } else if (entrada.campo.tipo === "checkbox") {
        v[nome] = entrada.el.checked ? 1 : 0;
      } else {
        const texto = entrada.el.value.trim();
        // A API espera "AAAA-MM-DD HH:MM"; o input datetime-local usa "T".
        v[nome] = entrada.campo.tipo === "datetime-local" ? texto.replace("T", " ") : texto;
      }
    }
    return v;
  }

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (botao.disabled || !validar()) return;
    const textoOriginal = botao.textContent;
    botao.disabled = true;
    botao.replaceChildren(h("span", { class: "spinner", "aria-hidden": "true" }), " Enviando...");
    try {
      await aoEnviar(await valores());
    } catch (erro) {
      aplicarErrosServidor(erro);
    } finally {
      botao.disabled = false;
      botao.textContent = textoOriginal;
    }
  });

  return {
    form,
    // Preenche o formulario para edicao (ou limpa se obj for null).
    preencher(obj) {
      for (const [nome, entrada] of entradas) {
        mostrarErroCampo(entrada.el, null);
        const valor = obj ? obj[nome] : undefined;
        if (entrada.campo.tipo === "imagem") {
          entrada.arquivo = null; entrada.el.value = ""; entrada.previa.hidden = true;
          entrada.imagemId = valor ?? null;
          entrada.imagemAtual.textContent = valor ? "Imagem atual mantida (envie outra para substituir)." : "";
          if (valor) { entrada.previa.src = `/api/imagens/${valor}`; entrada.previa.hidden = false; }
        } else if (entrada.campo.tipo === "checkbox") {
          entrada.el.checked = obj ? Boolean(valor) : Boolean(entrada.campo.valorPadrao);
        } else if (entrada.campo.tipo === "datetime-local") {
          entrada.el.value = valor ? String(valor).replace(" ", "T").slice(0, 16) : "";
        } else if (obj) {
          entrada.el.value = valor ?? "";
        } else {
          entrada.el.value = entrada.campo.valorPadrao ?? (entrada.campo.opcoes ? entrada.el.options[0]?.value : "");
        }
      }
    },
  };
}
