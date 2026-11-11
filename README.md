# 🌿 Saquarema Verde Online

Plataforma digital informativa sobre ecoturismo, biodiversidade, eventos, gastronomia e experiências da comunidade no município de Saquarema — **Situação-Problema #3: Circuito Saquarema Verde**.

## 👥 Integrantes da Equipe
| Nome | Matrícula | Curso/Turma |
|------|-----------|-------------|
| JOSE CESAR MEDEIROS GOMES | 06012011 | Análise e Desenvolvimento de Software — 4º |
| DOUGLAS STEFANIE DE SOUZA | 06014318 | Análise e Desenvolvimento de Software — 4º |
| VINÍCIUS JOSÉ DE ALMEIDA DE FREITAS | 06014004 | Análise e Desenvolvimento de Software — 4º |

---

## 🧩 Situação-Problema #3: Circuito Saquarema Verde

A geografia do território municipal de Saquarema é caracterizada pela área costeira, com o turismo do surf, e um ambiente montanhoso que atrai tanto turistas quanto moradores locais. Para fortalecer o ecoturismo na região e promover a conscientização ambiental, é fundamental que os turistas e moradores tenham acesso fácil e rápido às informações sobre as atrações naturais e culturais disponíveis.

O **Parque Estadual da Costa do Sol** e a **Reserva Ecológica Estadual de Jacarepiá** são duas áreas de destaque que oferecem trilhas, atividades ao ar livre e oportunidades para a apreciação da fauna e flora locais. No entanto, muitos visitantes ainda enfrentam dificuldades para encontrar informações atualizadas sobre essas atrações, como condições das trilhas, eventos programados, dicas de segurança e regras de visitação.

Diante desse cenário, a plataforma **Saquarema Verde Online** centraliza informações relevantes, facilita o planejamento de visitas e incentiva a interação entre turistas e a comunidade local.

---

## 🏗️ Arquitetura e Estrutura do Projeto

O sistema unifica o **Back-End** (Node.js + Express + SQLite via `better-sqlite3`) e o **Front-End** modular (HTML5, CSS3 e ES Modules nativos, sem etapa de build), servidos pela mesma aplicação:

```
├── data/                        # Banco SQLite (saquarema.db)
├── docs/
│   └── requisitos-backend.md    # Especificação de Requisitos Funcionais e Não-Funcionais
├── public/                      # Front-End modular servido pelo Express
│   ├── index.html               # Página inicial: Últimas Notícias, Próximos Eventos e Atrações
│   ├── biodiversidade.html      # Trilhas, Cachoeiras, Mirantes, Fauna e Flora com filtros
│   ├── eventos.html             # Programação de eventos da cidade
│   ├── gastronomia.html         # Restaurantes e estabelecimentos locais
│   ├── comunidade.html          # Relatos de experiências de visitantes
│   ├── atracao.html             # Detalhe de atração com subdivisões (Biodiversidade + Eventos)
│   ├── login.html               # Autenticação de usuários e administradores
│   ├── admin.html               # Painel de controle com CRUD completo e upload de imagens
│   ├── usuarios.html            # Gestão de usuários, níveis de acesso e permissões por módulo
│   ├── assets/                  # Logos e imagens iniciais do seed
│   ├── css/                     # Estilos modulares (base, layout, componentes, páginas)
│   └── js/                      # Módulos ES (api, ui, validacao, formulario, layout, páginas)
├── src/                         # Código-fonte do Back-End
│   ├── app.js                   # Configuração Express, Helmet, Compression, CORS e rotas
│   ├── server.js                # Inicialização do servidor e seed automático
│   ├── config/                  # Variáveis de ambiente e configurações
│   ├── controllers/             # Controladores REST (atrações, biodiversidade, eventos, usuários, etc.)
│   ├── database/                # Conexão SQLite, migração automática e seed inicial
│   ├── middlewares/             # Autenticação JWT, verificação de permissões (RBAC), rate limiting e erros
│   ├── routes/                  # Definição de rotas da API (/api/*)
│   └── utils/                   # Validações, matriz de permissões (RBAC) e serialização
├── test/                        # Testes automatizados (node:test)
│   ├── api.test.js              # Testes de integração de todos os endpoints
│   └── migracao.test.js         # Teste de migração idempotente de bancos legados
├── .dockerignore                # Arquivos ignorados no contexto de build do Docker
├── .env.example                 # Exemplo de variáveis de ambiente
├── .nvmrc                       # Versão recomendada do Node.js (20.19.0)
├── Dockerfile                   # Imagem Docker da aplicação (Node 20 Alpine)
└── docker-compose.yml           # Orquestração do contêiner e volume persistente do SQLite
```

---

## 🚀 Funcionalidades Principais

1. **Página Inicial de Notícias (`/`)**: exibe a notícia mais recente em destaque e o mural de novidades (todas com imagem obrigatória), acompanhada da barra lateral de **Próximos Eventos** e dos cartões de **Atrações**.
2. **Atrações Subdivididas (`/atracao?id=`)**: cada atração (como o Parque Estadual da Costa do Sol e a Reserva de Jacarepiá) concentra suas regras de visitação, condição de funcionamento e horários, subdividindo-se em seus itens de **Biodiversidade** e **Eventos**.
3. **Biodiversidade (`/biodiversidade`)**: evolução do antigo módulo de trilhas para contemplar *Trilha, Cachoeira, Mirante, Fauna, Flora e Outro*, informando distância, duração, dificuldade, condição (*Aberta, Manutenção, Fechada*), se é gratuito, se é permanente ou temporário, recomendações e dicas de segurança.
4. **Eventos (`/eventos`)**: listagem dos próximos eventos de Saquarema com suporte a período de início/fim, horário de funcionamento, local, gratuidade, link externo e imagem armazenada no banco.
5. **Gastronomia (`/gastronomia`)**: catálogo de restaurantes e estabelecimentos locais com endereço, horário de funcionamento, telefone e foto.
6. **Comunidade (`/comunidade`)**: espaço aberto para visitantes enviarem relatos de suas experiências (vinculados a uma atração e, opcionalmente, a um item de biodiversidade), com proteção anti-spam (rate limit) e moderação pelo administrador.
7. **Imagens no Banco de Dados (`/api/imagens`)**: upload binário validado por *magic bytes* (`image/jpeg`, `image/png`, `image/webp` até 2 MB) armazenado como `BLOB` no SQLite e servido com cache imutável.
8. **Painel de Controle (`/admin`)**: CRUD completo para Notícias, Biodiversidade, Eventos, Atrações, Gastronomia e moderação de Relatos, com validação visual em tempo real e pré-visualização de imagens.
9. **Gestão de Usuários e Permissões — RBAC (`/usuarios`)**: cadastro e edição de usuários com níveis de acesso (**Administrador**, **Gestor**, **Colaborador** e **Personalizado**) e matriz de permissões granular por módulo (**Ler**, **Cadastrar**, **Editar** e **Excluir**).

---

## 🔌 Endpoints da API REST (`/api`)

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| `GET` | `/api/saude` | Público | Verificação de saúde da API |
| `POST` | `/api/auth/login` | Público | Autenticação de usuário/administrador (retorna JWT + permissões) |
| `GET` | `/api/auth/eu` | Autenticado | Retorna os dados, nível e matriz de permissões do usuário logado |
| `GET` | `/api/usuarios` | Permissão `usuarios` | Lista usuários cadastrados e perfis padrão de permissão |
| `GET` | `/api/usuarios/:id` | Permissão `usuarios` | Detalha um usuário |
| `POST / PUT / DELETE` | `/api/usuarios(/:id)` | Permissão `usuarios` | Cria, atualiza nível/permissões ou remove usuário |
| `GET` | `/api/imagens/:id` | Público | Retorna o binário da imagem armazenada no banco |
| `POST` | `/api/imagens` | Permissão de escrita | Envia imagem (`jpeg`/`png`/`webp`, máx. 2 MB) |
| `DELETE` | `/api/imagens/:id` | Permissão de escrita | Remove uma imagem |
| `GET` | `/api/noticias` | Público | Lista notícias paginadas (com `imagem_url`) |
| `GET` | `/api/noticias/:id` | Público | Detalha uma notícia |
| `POST / PUT / DELETE` | `/api/noticias(/:id)` | Permissão `noticias` | Publica (exige `imagem_id`), edita ou exclui notícia |
| `GET` | `/api/atracoes` | Público | Lista atrações (filtro `?q=`) |
| `GET` | `/api/atracoes/:id` | Público | Detalha atração com `biodiversidade[]`, `eventos[]` e `relatos[]` |
| `POST / PUT / DELETE` | `/api/atracoes(/:id)` | Permissão `atracoes` | Cria, atualiza disponibilidade/horários ou remove atração |
| `GET` | `/api/biodiversidade` | Público | Lista itens com filtros (`?atracao_id=`, `?categoria=`, `?dificuldade=`, `?q=`) |
| `GET` | `/api/biodiversidade/:id` | Público | Detalha item de biodiversidade |
| `POST / PUT / DELETE` | `/api/biodiversidade(/:id)` | Permissão `biodiversidade` | CRUD completo de biodiversidade |
| `GET` | `/api/eventos` | Público | Lista próximos eventos (`?todos=1` inclui encerrados, `?atracao_id=`) |
| `GET` | `/api/eventos/:id` | Público | Detalha um evento |
| `POST / PUT / DELETE` | `/api/eventos(/:id)` | Permissão `eventos` | CRUD completo de eventos |
| `GET` | `/api/gastronomia` | Público | Lista estabelecimentos gastronômicos |
| `GET` | `/api/gastronomia/:id` | Público | Detalha estabelecimento |
| `POST / PUT / DELETE` | `/api/gastronomia(/:id)` | Permissão `gastronomia` | CRUD completo de gastronomia |
| `GET` | `/api/relatos` | Público | Lista relatos da comunidade (`?atracao_id=`, `?biodiversidade_id=`) |
| `POST` | `/api/relatos` | Público | Publica novo relato (com rate limit) |
| `DELETE` | `/api/relatos/:id` | Permissão `relatos` | Remove relato (moderação) |

---

## 🖥️ Como Executar o Projeto

### Variáveis de Ambiente (Opcional)
As configurações possuem valores padrão para desenvolvimento e podem ser personalizadas via variáveis de ambiente ou arquivo `.env` (baseado no `.env.example`):

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` / `PORTA` | `3000` | Porta HTTP onde o servidor Express escuta (compatível com `PORT` dinâmico de nuvens como Render) |
| `DB_PATH` | `data/saquarema.db` | Caminho do arquivo do banco SQLite |
| `JWT_SECRET` | `saquarema-verde-mvp-secret-2026` | Chave secreta para assinatura dos tokens JWT |
| `JWT_EXPIRES_IN` | `8h` | Tempo de expiração do token JWT |
| `ADMIN_SENHA` | `Admin@123` | Senha inicial do administrador criada durante o *seed* |
| `CORS_ORIGIN` | *(mesma origem)* | Origem externa opcional permitida via CORS |

---

### Opção 1: Execução com Docker / Docker Compose (Recomendado)

#### Pré-requisitos
- **Docker** e **Docker Compose** instalados.

#### Passo a passo
1. Construa a imagem e inicie o contêiner em segundo plano:
   ```bash
   docker compose up -d --build
   ```
   > O banco de dados SQLite (`/app/data/saquarema.db`) é inicializado e populado automaticamente no primeiro início e persistido no volume Docker `saquarema_data`.

2. Acompanhe os logs da aplicação (opcional):
   ```bash
   docker compose logs -f app
   ```

3. Para encerrar os serviços:
   ```bash
   docker compose down
   ```

---

### Opção 2: Execução Local com Node.js

#### Pré-requisitos
- **Node.js 20.x** (veja `.nvmrc`)

#### Passo a passo
1. Instale as dependências:
   ```bash
   npm install
   ```
2. (Opcional) Popule ou atualize o banco de dados manualmente:
   ```bash
   npm run seed
   ```
3. Inicie o servidor:
   ```bash
   npm start
   ```

---

### 🌐 Acessos Padrão
Após iniciar a aplicação (via Docker ou Node.js), acesse no navegador:
- **Site público**: `http://localhost:3000`
- **Healthcheck da API**: `http://localhost:3000/api/saude`
- **Painel administrativo**: `http://localhost:3000/login`
  - **Usuário / E-mail**: `admin@saquaremaverde.local` (ou `admin`)
  - **Senha padrão**: `Admin@123`

### 🧪 Executar os Testes Automatizados
```bash
npm test
```
