import { api, sessao } from "../api.js";
import { toast } from "../ui.js";
import { criarFormulario } from "../formulario.js";

if (sessao.token()) location.replace("/admin");

const formulario = criarFormulario({
  prefixo: "login",
  rotulo: "Entrar",
  campos: [
    { nome: "usuario", rotulo: "Usuário ou e-mail", obrigatorio: true, min: 3, max: 120, autocomplete: "username" },
    { nome: "senha", rotulo: "Senha", tipo: "password", obrigatorio: true, min: 6, max: 100, autocomplete: "current-password" },
  ],
  async aoEnviar(valores) {
    const dados = await api.login(valores.usuario, valores.senha);
    sessao.salvar(dados.token, dados.usuario);
    toast("Login realizado com sucesso!");
    location.href = "/admin";
  },
});

document.getElementById("area-form").append(formulario.form);
formulario.form.querySelector("input").focus();
