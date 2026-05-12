# Marketplace — Trabalho II

Evolução do marketplace com perfis completos, múltiplas imagens por produto e sistema de comentários com curtidas.

## Instalação e execução

### Pré-requisitos

- Docker e Docker Compose
- OU Node.js 16+ + npm

### Opção 1: Com Docker (Recomendado)

```bash
# 1. Executar com Docker
npm run dev:docker
```

Acesse: [http://localhost:3333](http://localhost:3333)

### Opção 2: Local

```bash
# 1. Instalar dependências
npm install

# 2. Configurar ambiente
cp .env.example .env

# 3. Executar migrações
npm run migrate

# 4. Iniciar servidor
npm run dev
```

---

## Usuários de teste

| Perfil     | E-mail                    | Senha       | CPF         |
|------------|---------------------------|-------------|-------------|
| Admin      | admin@marketplace.com     | admin123    | 00000000000 |
| Vendedor   | vendedor@marketplace.com  | vendedor123 | 11111111111 |
| Comprador  | comprador@marketplace.com | comprador123| 22222222222 |

> Usuários devem ser criados através da interface de cadastro da aplicação.

---

## Funcionalidades implementadas

### 1. Perfil do Comprador
Área completa para visualizar e editar dados pessoais: telefone, endereço completo, cidade, estado, CEP e forma de pagamento preferencial. Acesso restrito ao próprio usuário com validação no backend.

### 2. Perfil do Vendedor
Perfil público e privado com informações da loja: nome, descrição, telefone comercial, localização e categorias de produtos. Outros usuários podem visualizar o perfil público do vendedor.

### 3. Múltiplas Imagens por Produto
Upload de até 5 fotos por produto com a primeira definida como principal. Galeria com carrossel na página de detalhes do produto.

### 4. Página de Detalhes Rica
Página completa do produto com galeria de imagens, informações do vendedor, área de comentários e total de curtidas recebidas nos comentários.

### 5. Sistema de Comentários
Usuários autenticados podem comentar nos produtos com foto opcional. Autores podem editar/excluir próprios comentários e admins podem moderar conteúdo inadequado.

### 6. Sistema de Curtidas
Cada comentário pode receber curtidas de usuários autenticados. Sistema previne duplicatas (uma curtida por usuário por comentário) com constraint no banco de dados.

### 7. Controle de Acesso
Permissões por perfil: compradores editam apenas seu perfil, vendedores gerenciam perfil e produtos próprios, admins moderam comentários. Usuários não autenticados podem visualizar produtos mas não interagir.

---

## Tecnologias utilizadas

- **Backend:** Node.js, Express, TypeScript
- **Banco:** SQLite com Prisma ORM
- **Frontend:** EJS, TailwindCSS, Bootstrap
- **Upload:** Multer (local/AWS S3)
- **Validação:** Zod
- **Containerização:** Docker

---

## Estrutura do projeto

```
src/
├── config/          # Configurações (banco, upload)
├── controllers/     # Lógica de negócio
│   ├── BuyerProfileController.ts
│   ├── SellerProfileController.ts
│   ├── CommentsController.ts
│   └── ProductsController.ts
├── views/           # Templates EJS
│   ├── buyer-profile.ejs
│   ├── seller-profile.ejs
│   ├── product-details.ejs
│   └── home.ejs
├── middleware/      # Autenticação e validação
├── services/        # Upload de imagens
└── index.ts         # Servidor principal
```