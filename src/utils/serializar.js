"use strict";

// Acrescenta imagem_url a uma linha que possua imagem_id.
function comImagem(linha) {
  if (!linha) return linha;
  return { ...linha, imagem_url: linha.imagem_id ? `/api/imagens/${linha.imagem_id}` : null };
}

// Monta "SET a = @a, b = @b" a partir de um objeto de atualizacoes.
function montarSet(atualizacoes) {
  return Object.keys(atualizacoes).map((c) => `${c} = @${c}`).join(", ");
}

module.exports = { comImagem, montarSet };
