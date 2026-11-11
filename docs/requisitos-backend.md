# Requisitos do MVP — Saquarema Verde Online

## Escopo (o que o MVP NÃO faz)
- Não realiza pagamentos, reservas ou venda de ingressos;
- Não envia e-mails nem notificações push;
- Não faz upload de fotos nos relatos de visitantes;
- Não exige cadastro de visitantes para publicar relatos;
- Não integra com sistemas externos (ex.: prefeitura, INEA) — dados são mantidos pelos administradores;
- Não implementa recuperação automática de senha do administrador.

## Requisitos Funcionais (RF)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF01 | A API deve listar e detalhar as **atrações** (unidades principais como parques, reservas e pontos culturais) com condição, horários, regras de visitação e imagem, subdividindo cada atração em **biodiversidade** e **eventos** | Alta |
| RF02 | A API deve oferecer CRUD completo de **biodiversidade** (*Trilha, Cachoeira, Mirante, Fauna, Flora, Outro*), vinculada a uma atração, com distância, dificuldade, duração, condição, funcionamento, gratuidade, permanência (*Permanente/Temporário*), recomendações, dicas de segurança e imagem | Alta |
| RF03 | A API deve oferecer CRUD completo de **eventos**, vinculados a uma atração, com data/hora de início e término, local, funcionamento, gratuidade, permanência, link externo e imagem, listando por padrão os próximos eventos | Alta |
| RF04 | A API deve oferecer CRUD completo de **notícias** (exibidas na página inicial), exigindo **imagem obrigatória** na publicação | Alta |
| RF05 | A API deve oferecer CRUD completo de **gastronomia** (nome, tipo, descrição, endereço, funcionamento, telefone e imagem) | Média |
| RF06 | A API deve receber upload binário de **imagens** (`jpeg`, `png`, `webp` até 2 MB), armazená-las como `BLOB` no SQLite e servi-las em `/api/imagens/:id` | Alta |
| RF07 | O sistema deve disponibilizar login com usuário/e-mail e senha, emitindo token JWT, e permitir a **gestão de usuários e permissões por módulo (RBAC)** (*Administrador, Gestor, Colaborador, Personalizado* com ações *Ler, Cadastrar, Editar, Excluir*) | Alta |
| RF08 | A API deve permitir que visitantes publiquem **relatos** na página de Comunidade (vinculados a uma atração e opcionalmente a um item de biodiversidade) e permitir que administradores removam relatos | Alta |
| RF09 | O front-end deve ser modular, consumir exclusivamente a API REST e validar formulários com feedback visual imediato (erros por campo, estados de envio, confirmação de exclusão e notificações toast) | Alta |
| RF10 | A API deve disponibilizar rota de verificação de saúde (`/api/saude`) para monitoramento | Baixa |

## Requisitos Não-Funcionais (RNF) — exigências do desafio

| ID | Exigência | Requisito | Categoria |
|----|-----------|-----------|-----------|
| RNF01 | **Gestão de Disponibilidade** | Atualizações de condição, horários, eventos e notícias por administradores refletem imediatamente nas consultas públicas | Funcionalidade |
| RNF02 | **Desempenho Rápido** | Compressão HTTP (`compression`), índices no SQLite (modo WAL), paginação (`limite`/`pagina`) e cache imutável para imagens | Desempenho |
| RNF03 | **Interface Intuitiva** | Navegação clara (Notícias, Biodiversidade, Eventos, Gastronomia, Comunidade e Login), layout responsivo e estados visuais de carregamento/vazio/erro | Usabilidade |
| RNF04 | **Segurança de Dados** | Senhas com bcrypt, JWT com expiração e segredo obrigatório em produção, Helmet com CSP, CORS restrito à mesma origem, validação de *magic bytes* em imagens, rate limit no login e nos relatos, e renderização DOM segura (`textContent`) contra XSS | Segurança |
| RNF05 | **Login para Administradores** | Botão de login destacado no cabeçalho e autenticação JWT obrigatória em todas as rotas de escrita administrativas | Segurança |
| RNF06 | Persistência em banco relacional SQLite (`better-sqlite3`), com migração automática e backup de bancos legados | Portabilidade |
| RNF07 | Código organizado em `src/`, `public/`, `test/` e `data/` | Manutenibilidade |
| RNF08 | Testes automatizados cobrindo autenticação, CRUDs, upload de imagens, moderação e migração de schema | Qualidade |
