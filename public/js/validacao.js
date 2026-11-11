// Regras de validacao do front. Espelham as regras da API para dar feedback imediato.
export const IMAGEM_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGEM_TIPOS = ["image/jpeg", "image/png", "image/webp"];

// Retorna a mensagem de erro (string) ou null se o valor for valido.
export function validarValor(valor, regra = {}) {
  const rotulo = regra.rotulo || "Campo";

  if (regra.tipo === "imagem") {
    const arquivo = valor;
    if (!arquivo) return regra.obrigatorio ? `${rotulo}: selecione uma imagem.` : null;
    if (!IMAGEM_TIPOS.includes(arquivo.type)) return "Formato inválido. Use JPEG, PNG ou WebP.";
    if (arquivo.size > IMAGEM_MAX_BYTES) return "A imagem deve ter no máximo 2 MB.";
    return null;
  }

  if (regra.tipo === "checkbox") return null;

  const texto = String(valor ?? "").trim();
  if (!texto) return regra.obrigatorio ? `${rotulo}: preenchimento obrigatório.` : null;
  if (regra.min && texto.length < regra.min) return `${rotulo} deve ter no mínimo ${regra.min} caracteres.`;
  if (regra.max && texto.length > regra.max) return `${rotulo} deve ter no máximo ${regra.max} caracteres.`;

  if (regra.tipo === "number") {
    const n = Number(texto.replace(",", "."));
    if (!Number.isFinite(n) || n < (regra.minimo ?? 0)) return `${rotulo} deve ser um número válido.`;
  }
  if (regra.tipo === "url" && !/^https?:\/\/\S+$/i.test(texto)) return `${rotulo} deve começar com http:// ou https://.`;
  if (regra.tipo === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) return "E-mail inválido.";
  if (regra.tipo === "datetime-local" && Number.isNaN(new Date(texto).getTime())) return `${rotulo} inválido.`;
  return null;
}

// Exibe/limpa o erro de um campo (aria-invalid + mensagem associada).
export function mostrarErroCampo(entrada, mensagem) {
  const erro = document.getElementById(`erro-${entrada.id}`);
  if (mensagem) {
    entrada.setAttribute("aria-invalid", "true");
    if (erro) erro.textContent = mensagem;
  } else {
    entrada.removeAttribute("aria-invalid");
    if (erro) erro.textContent = "";
  }
}
