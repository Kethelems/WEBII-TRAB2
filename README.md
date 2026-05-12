# Marketplace - Trabalho II (Projeto Final)

Evolução completa do marketplace com perfis detalhados, múltiplas imagens por produto e sistema interativo de comentários com curtidas.

## 🎯 Sobre o Projeto

Este é o **Trabalho II** da disciplina, uma evolução significativa do marketplace desenvolvido nas Aulas 07 e 08. O projeto implementa todas as funcionalidades solicitadas para criar um marketplace completo e funcional.\n\n## Funcionalidades Implementadas\n\n### 1. Perfil do Comprador\n- ✅ Campos obrigatórios: telefone, endereço completo, cidade, estado, CEP, forma de pagamento\n- ✅ Edição restrita ao próprio usuário\n- ✅ Validação no backend com Zod\n- ✅ Página específica acessível em `/buyer/profile`\n\n### 2. Perfil do Vendedor\n- ✅ Campos obrigatórios: nome da loja, descrição, telefone comercial, cidade, estado, categorias\n- ✅ Perfil público acessível em `/seller/:id`\n- ✅ Edição restrita ao próprio vendedor\n- ✅ Produtos associados ao vendedor\n- ✅ Interface clara mostrando quem vende cada produto\n\n### 3. Tela de Detalhes do Produto\n- ✅ Informações completas: nome, descrição, categoria, preço, estoque\n- ✅ Galeria com múltiplas fotos (carrossel)\n- ✅ Informações do vendedor com link para perfil público\n- ✅ Área de comentários integrada\n- ✅ Total de curtidas dos comentários\n- ✅ Navegação breadcrumb\n\n### 4. Sistema de Múltiplas Fotos\n- ✅ Upload de até 5 fotos por produto\n- ✅ Primeira foto definida como principal\n- ✅ Galeria com carrossel na página de detalhes\n- ✅ Validação de arquivos no backend\n\n### 5. Sistema de Comentários\n- ✅ Restrição a usuários autenticados\n- ✅ Associação ao autor e produto\n- ✅ Registro de data e hora\n- ✅ Upload de foto opcional\n- ✅ Edição e exclusão pelo autor\n- ✅ Remoção por admin\n- ✅ Ordenação por data (mais recentes primeiro)\n\n### 6. Sistema de Curtidas\n- ✅ Uma curtida por usuário por comentário\n- ✅ Possibilidade de remover curtida\n- ✅ Contagem exibida em cada comentário\n- ✅ Prevenção de duplicatas no banco (constraint unique)\n- ✅ Validação no backend\n\n### 7. Controle de Acesso\n- ✅ Comprador edita apenas seu perfil\n- ✅ Vendedor edita apenas seu perfil e produtos\n- ✅ Usuários autenticados podem comentar e curtir\n- ✅ Admin pode moderar comentários\n- ✅ Usuários não autenticados podem visualizar produtos\n\n## Instalação e Execução

### Pré-requisitos
- Docker e Docker Compose
- OU Node.js (versão 16 ou superior) + npm

### Opção 1: Executar com Docker (Recomendado)

1. **Clone o repositório e navegue para a pasta do projeto:**
```bash
cd Trabalho2
```

2. **Execute com Docker Compose (desenvolvimento):**
```bash
npm run dev:docker
```

3. **Ou execute o comando Docker diretamente:**
```bash
docker compose --profile dev up --build app-dev
```

4. **Para parar o container:**
```bash
npm run dev:docker:down
```

5. **Acesse a aplicação:**
```
http://localhost:3333
```

**Observações Docker:**
- O banco de dados SQLite é criado automaticamente
- As migrações são executadas no primeiro build
- A pasta `uploads/` é mapeada para persistir imagens
- Hot reload está habilitado para desenvolvimento

### Opção 2: Executar Localmente (sem Docker)

1. **Navegue para a pasta do projeto:**
```bash
cd Trabalho2
```

2. **Copie o arquivo de configuração:**
```bash
cp .env.example .env
```

3. **Execute o setup completo:**
```bash
npm run setup
```

4. **Inicie o servidor de desenvolvimento:**
```bash
npm run dev
```

5. **Acesse a aplicação:**
```
http://localhost:3333
```\n\n## Usuários de Teste\n\n### Admin\n- **Email:** admin@marketplace.com\n- **Senha:** admin123\n- **CPF:** 00000000000\n- **Perfil:** Administrador\n\n### Vendedor\n- **Email:** vendedor@marketplace.com\n- **Senha:** vendedor123\n- **CPF:** 11111111111\n- **Perfil:** Vendedor\n\n### Comprador\n- **Email:** comprador@marketplace.com\n- **Senha:** comprador123\n- **CPF:** 22222222222\n- **Perfil:** Comprador\n\n*Nota: Estes usuários devem ser criados através da interface de cadastro da aplicação.*\n\n## Estrutura do Projeto\n\n```\nsrc/\n├── config/          # Configurações (banco, upload, etc.)\n├── controllers/     # Controladores das rotas\n│   ├── BuyerProfileController.ts\n│   ├── SellerProfileController.ts\n│   ├── CommentsController.ts\n│   ├── ProductsController.ts\n│   └── UsersController.ts\n├── views/           # Templates EJS\n│   ├── buyer-profile.ejs\n│   ├── seller-profile.ejs\n│   ├── seller-public.ejs\n│   ├── product-details.ejs\n│   ├── home.ejs\n│   └── seller-dashboard.ejs\n├── constants/       # Constantes (categorias, etc.)\n├── middleware/      # Middlewares de autenticação\n├── services/        # Serviços (upload de imagens)\n├── utils/           # Utilitários (hash de senha)\n└── index.ts         # Arquivo principal\n```\n\n## Banco de Dados\n\n### Novos Modelos Adicionados:\n\n- **BuyerProfile**: Perfil completo do comprador\n- **SellerProfile**: Perfil completo do vendedor\n- **ProductImage**: Múltiplas imagens por produto\n- **Comment**: Comentários nos produtos\n- **CommentLike**: Curtidas nos comentários\n\n### Relacionamentos:\n- User 1:1 BuyerProfile\n- User 1:1 SellerProfile\n- Product 1:N ProductImage\n- Product 1:N Comment\n- Comment 1:N CommentLike\n- User 1:N Comment\n- User 1:N CommentLike\n\n## Regras de Negócio - Comentários e Curtidas\n\n### Comentários:\n1. Apenas usuários autenticados podem comentar\n2. Cada comentário fica vinculado ao autor e ao produto\n3. Data e hora são registradas automaticamente\n4. Foto é opcional e validada no backend\n5. Autor pode editar/excluir próprios comentários\n6. Admin pode remover qualquer comentário\n7. Comentários são ordenados por data (mais recentes primeiro)\n\n### Curtidas:\n1. Um usuário pode curtir um comentário apenas uma vez\n2. Usuário pode remover sua curtida a qualquer momento\n3. Contagem é exibida em tempo real\n4. Constraint UNIQUE no banco previne duplicatas\n5. Validação adicional no backend\n6. Interface atualiza dinamicamente via JavaScript\n\n## Tecnologias Utilizadas\n\n- **Backend:** Node.js, Express, TypeScript\n- **Banco de Dados:** SQLite com Prisma ORM\n- **Frontend:** EJS, TailwindCSS, Bootstrap\n- **Upload:** Multer com suporte a AWS S3\n- **Validação:** Zod\n- **Autenticação:** Express Session\n\n## Observações Técnicas\n\n1. **Upload de Imagens:** Configurado para funcionar localmente e com AWS S3\n2. **Validação:** Todas as entradas são validadas no backend usando Zod\n3. **Segurança:** Senhas são hasheadas, sessões são gerenciadas adequadamente\n4. **Responsividade:** Interface adaptável para diferentes tamanhos de tela\n5. **Performance:** Consultas otimizadas com includes específicos do Prisma\n\n## Scripts Disponíveis

- `npm run setup`: Instala dependências, executa migrações e gera cliente Prisma
- `npm run dev`: Inicia servidor de desenvolvimento
- `npm run dev:docker`: Inicia com Docker Compose (desenvolvimento)
- `npm run dev:docker:down`: Para containers Docker
- `npm run build`: Compila TypeScript para JavaScript
- `npm start`: Inicia servidor de produção
- `npm run migrate`: Executa migrações do banco
- `npm run migrate:reset`: Reseta o banco de dados
- `npm run db:generate`: Gera cliente Prisma
- `npm run db:studio`: Abre Prisma Studio (interface visual do banco)\n\n## Configurações de Ambiente

### Variáveis de Ambiente (.env)

O projeto inclui um arquivo `.env.example` com todas as configurações necessárias:

```bash
# Copiar arquivo de exemplo
cp .env.example .env
```

**Principais configurações:**
- `PORT`: Porta do servidor (padrão: 3333)
- `SESSION_SECRET`: Chave secreta para sessões
- `UPLOAD_DRIVER`: Tipo de upload (local ou s3)
- `DATABASE_URL`: URL do banco de dados SQLite

### Upload de Imagens

**Local (padrão):**
- Imagens são salvas na pasta `uploads/products/`
- Configurar `UPLOAD_DRIVER=local` no .env

**AWS S3 (opcional):**
- Configurar credenciais AWS no .env
- Definir `UPLOAD_DRIVER=s3`
- Bucket S3 deve estar configurado

## Estrutura de Rotas\n\n- `GET /` - Página inicial com produtos\n- `GET /products/:id` - Detalhes do produto\n- `GET /seller/:id` - Perfil público do vendedor\n- `GET /buyer/profile` - Perfil do comprador (privado)\n- `GET /seller/profile` - Perfil do vendedor (privado)\n- `POST /comments` - Criar comentário\n- `PUT /comments/:id` - Editar comentário\n- `DELETE /comments/:id` - Excluir comentário\n- `POST /comments/:id/like` - Curtir/descurtir comentário

## Troubleshooting

### Problemas Comuns

**Erro de migração:**
```bash
# Resetar banco e recriar
npm run migrate:reset
npm run migrate
```

**Erro de dependências:**
```bash
# Limpar e reinstalar
rm -rf node_modules package-lock.json
npm install
```

**Erro no Docker:**
```bash
# Rebuild completo
docker compose --profile dev down
docker compose --profile dev up --build app-dev
```

**Prisma Client desatualizado:**
```bash
npm run db:generate
```

### Logs e Debug

- Logs do servidor aparecem no terminal
- Para debug do banco: `npm run db:studio`
- Verificar uploads na pasta `uploads/products/`

## Entrega do Trabalho

### Checklist Final

- ✅ Todas as funcionalidades implementadas
- ✅ README.md completo
- ✅ Docker configurado
- ✅ Banco de dados com migrações
- ✅ Upload de múltiplas imagens
- ✅ Sistema de comentários e curtidas
- ✅ Controle de acesso por perfil
- ✅ Interface responsiva

### Para o Vídeo de Demonstração

1. **Mostrar funcionalidades (5 min):**
   - Cadastro e login de diferentes perfis
   - Perfil do comprador e vendedor
   - Upload de múltiplas imagens
   - Sistema de comentários com curtidas
   - Navegação entre páginas

2. **Mostrar código (10 min):**
   - Estrutura do projeto
   - Controllers principais
   - Schema do Prisma
   - Views com funcionalidades
   - Sistema de upload e validação