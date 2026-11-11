// Cliente da API: unico ponto de contato do front com o back-end.
const CHAVE_TOKEN = "saquarema_token";
const CHAVE_USUARIO = "saquarema_usuario";

export const sessao = {
  token: () => localStorage.getItem(CHAVE_TOKEN),
  usuario: () => {
    try { return JSON.parse(localStorage.getItem(CHAVE_USUARIO) || "null"); } catch { return null; }
  },
  salvar(token, usuario) {
    localStorage.setItem(CHAVE_TOKEN, token);
    localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
  },
  limpar() {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_USUARIO);
  },
};

export class ErroApi extends Error {
  constructor(mensagem, status, erros = []) {
    super(mensagem);
    this.status = status;
    this.erros = erros;
  }
}

async function requisitar(metodo, caminho, { corpo, bruto, tipo, autenticado = false } = {}) {
  const headers = {};
  if (autenticado || sessao.token()) {
    const token = sessao.token();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let body;
  if (bruto) {
    headers["Content-Type"] = tipo;
    body = bruto;
  } else if (corpo !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(corpo);
  }

  let resposta;
  try {
    resposta = await fetch(`/api${caminho}`, { method: metodo, headers, body });
  } catch {
    throw new ErroApi("Não foi possível conectar ao servidor. Verifique sua conexão.", 0);
  }

  const texto = await resposta.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = null; }

  if (!resposta.ok) {
    if (resposta.status === 401 && autenticado) sessao.limpar();
    const erros = dados?.erros || (dados?.erro ? [dados.erro] : []);
    throw new ErroApi(erros.join(" ") || "Erro ao comunicar com o servidor.", resposta.status, erros);
  }
  return dados;
}

function query(params = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const api = {
  get: (caminho, params) => requisitar("GET", caminho + query(params)),
  post: (caminho, corpo) => requisitar("POST", caminho, { corpo }),
  login: (email, senha) => requisitar("POST", "/auth/login", { corpo: { email, senha } }),
  admin: {
    post: (caminho, corpo) => requisitar("POST", caminho, { corpo, autenticado: true }),
    put: (caminho, corpo) => requisitar("PUT", caminho, { corpo, autenticado: true }),
    del: (caminho) => requisitar("DELETE", caminho, { autenticado: true }),
    // Envia o arquivo como corpo binario; retorna { id, url }.
    enviarImagem: (arquivo) => requisitar("POST", "/imagens", { bruto: arquivo, tipo: arquivo.type, autenticado: true }),
  },
};
