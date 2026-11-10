# Roadmap inicial para evoluir o MVP Saquarema Verde para Django

## 1) Objetivo

Este documento registra o setup inicial usado para transformar o protótipo estático em uma base Django com arquitetura mais sustentável para continuar o projeto em 17 dias, com esforço moderado e foco em aprender com o mínimo de fricção possível.

## 2) Setup que foi utilizado

### Passo 1 - Ambiente virtual

```bash
cd "c:\Users\Vinícius\Documents\Repositorios\Estudos\Unifeso\ADS_MVP_Circuito_Saquarema_Verde"
C:/Users/Vinícius/AppData/Local/Python/pythoncore-3.14-64/python.exe -m venv .venv
```

### Passo 2 - Instalação do Django

```bash
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install django djangorestframework
```

### Passo 3 - Criação do projeto Django em pasta separada

```bash
mkdir backend
cd backend
..\.venv\Scripts\python.exe -m django startproject core .
```

### Passo 4 - Criação do app do projeto

```bash
..\.venv\Scripts\python.exe manage.py startapp saquarema_app
```

### Passo 5 - Configuração do projeto

As principais alterações realizadas foram:

- incluir `rest_framework` e `saquarema_app` em `INSTALLED_APPS`
- definir `ALLOWED_HOSTS` para desenvolvimento local
- ajustar `LANGUAGE_CODE` para `pt-br`
- ajustar `TIME_ZONE` para `America/Sao_Paulo`
- incluir as rotas do app no `core/urls.py`

### Passo 6 - Validação inicial

```bash
..\.venv\Scripts\python.exe manage.py check
```

## 3) Estrutura sugerida para o projeto

```text
ADS_MVP_Circuito_Saquarema_Verde/
├── backend/
│   ├── core/
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── saquarema_app/
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   ├── views.py
│   │   └── migrations/
│   ├── manage.py
│   └── requirements.txt
├── Prototipo/
├── static files do projeto original
├── README.md
├── DJANGO_SETUP_GUIDE.md
└── .gitignore
```

## 4) Arquitetura proposta

### Camada 1 - Backend (Django)

- responsável pela lógica do negócio
- autenticação do admin
- CRUD de eventos, atrações e notícias
- API REST para consumo do frontend

### Camada 2 - Banco de dados (SQLite no início)

- simples para começar
- suficiente para o MVP
- fácil de migrar para PostgreSQL depois

### Camada 3 - Frontend (opcional no começo)

A recomendação mais prática é:

- manter o frontend atual em HTML/CSS/JS por alguns ciclos
- depois migrar para React ou manter com Django templates + Bootstrap

## 5) Roadmap de 17 dias

### Dias 1-2: base do projeto
- criar ambiente virtual
- configurar projeto Django
- criar app principal
- validar app rodando

### Dias 3-4: modelos e admin
- criar modelos de Evento, Atracao e Noticia
- configurar admin no Django
- criar primeiras fixtures de dados

### Dias 5-7: backend funcional
- CRUD de eventos
- API REST
- autenticação do administrador

### Dias 8-10: frontend público
- montar interfaces públicas para atracoes e eventos
- listar conteúdos no site
- refinar layout e responsividade

### Dias 11-13: painel administrativo
- dashboard de gestão
- criação e edição de eventos
- upload de imagens e textos

### Dias 14-15: validação e refinamento
- testes de fluxo principal
- revisitar UX e usabilidade
- limpar bugs e ajustar navegação

### Dias 16-17: documentação e apresentação
- revisar README
- preparar o pitch do projeto
- documentar passos para rodar localmente

## 6) Recomendação prática

Para um aluno começando do zero com apoio mínimo, a melhor rota é:

1. Django + SQLite
2. Django Admin para o painel
3. API REST simples
4. frontend público em Django templates ou React depois

Isso reduz a curva de aprendizado sem perder a visão de um projeto real e evolutivo.

## 7) Próximo passo recomendado

Depois desta base, o próximo passo é:

- criar os modelos reais do domínio;
- rodar `makemigrations` e `migrate`;
- criar um superuser;
- cadastrar os primeiros eventos e atrações;
- implementar a área de administração.

Este setup é uma base segura para continuar o projeto sem começar do zero novamente.
