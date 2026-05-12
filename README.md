# Marketplace — Trabalho II

Evolução do marketplace com perfis completos, múltiplas imagens por produto e sistema de comentários com curtidas.

## Instalação e execução

### Pré-requisitos

- Docker e Docker Compose
- OU Node.js 16+ + npm

### Opção 1: Com Docker (Recomendado)

```bash
# 1. Instalar dependências (no host, na pasta do projeto)
npm install

# 2. Migrações e seed (cria admin de teste — pode rodar no host antes do container)
npm run migrate
npm run db:seed

# 3. Subir o ambiente de desenvolvimento
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

# 4. Criar o administrador de teste
npm run db:seed

# 5. Iniciar servidor
npm run dev
```

> O **seed** cria apenas a conta de administrador (`kethelem@admin.com` / `kethelem123`). Compradores e vendedores devem ser criados pelo cadastro público (`/signup`), que envia **código de verificação por e-mail** (em desenvolvimento o link de pré-visualização aparece no terminal).

---

## Usuários de teste

| Perfil    | E-mail                 | Senha    | CPF         | Como obter |
|-----------|------------------------|----------|-------------|------------|
| Admin     | kethelem@admin.com     | kethelem123 | 00000000000 | `npm run db:seed` |
| Vendedor  | _(o que você cadastrar)_ | —        | 11 dígitos  | Cadastro em `/signup` + verificação de e-mail |
| Comprador | _(o que você cadastrar)_ | —        | 11 dígitos  | Cadastro em `/signup` + verificação de e-mail |

---

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

### 8. Autenticação e administração
- **Verificação de e-mail** após o cadastro público (código de 6 dígitos, expira em 30 minutos, reenvio em `/verificar-email`), com Nodemailer + Ethereal em desenvolvimento.
- **Conta ativa/inativa**: administrador pode desativar ou reativar usuários no painel (exceto a própria conta).
- **Login**: compradores e vendedores só entram com e-mail verificado; contas desativadas não autenticam.
- **Painel admin** (`/admin`): lista de usuários e alteração de status.
- **Logs de auditoria** (`/admin/logs`): registro de ações como login, cadastro, verificação de e-mail, logout e alteração de status.
- **Perfis no banco**: o campo `User.role` usa os valores `admin`, `comprador` e `vendedor` (rotas como `/buyer/profile` são apenas caminhos HTTP; o perfil persistido está em português).

---

## Tecnologias utilizadas

- **Backend:** Node.js, Express, TypeScript
- **Banco:** SQLite com Prisma ORM
- **Frontend:** EJS, TailwindCSS
- **Upload:** Multer (local/AWS S3)
- **Validação:** Zod
- **E-mail (dev):** Nodemailer + Ethereal
- **Containerização:** Docker

---

## Estrutura do projeto

```
src/
├── config/          # Configurações (banco, upload, e-mail)
│   ├── email.ts
│   ├── prisma.ts
│   └── upload.ts
├── controllers/     # Lógica de negócio
│   ├── BuyerProfileController.ts
│   ├── SellerProfileController.ts
│   ├── CommentsController.ts
│   ├── ProductsController.ts
│   └── UsersController.ts
├── views/           # Templates EJS
│   ├── _partials-head.ejs
│   ├── _partials-footer.ejs
│   ├── buyer-profile.ejs
│   ├── seller-profile.ejs
│   ├── seller-public.ejs
│   ├── product-details.ejs
│   ├── home.ejs
│   ├── login.ejs
│   ├── signup.ejs
│   ├── verify-email.ejs
│   ├── seller-dashboard.ejs
│   ├── admin.ejs
│   ├── admin-logs.ejs
│   ├── error.ejs
│   └── error-access.ejs
├── middleware/      # Autenticação e validação
│   └── auditLog.ts
├── services/        # Upload de imagens
│   └── product-image-storage.ts
├── utils/           # Utilitários
│   └── password.ts
├── constants/       # Constantes da aplicação
│   └── product-categories.ts
└── index.ts         # Servidor principal
prisma/
├── schema.prisma    # Modelo do banco de dados
├── seed.ts          # Admin de teste (npm run db:seed)
└── migrations/      # Histórico de migrações
```

---

## Detalhes de Implementação

### Verificação de e-mail, contas e auditoria

- Após `/signup`, o utilizador **não fica com sessão iniciada** até confirmar o código em `/verificar-email`.
- **Nodemailer + Ethereal** gera uma conta de teste e imprime no terminal o URL de pré-visualização do e-mail (equivalente ao fluxo do `WEBII-main`).
- O modelo `User` inclui `emailVerified`, `active`, `verificationCode` e `verificationExpires`.
- Ações como login, cadastro, verificação, reenvio de código, logout e alteração de status de utilizador são registadas na tabela **`AuditLog`** e listadas em **`/admin/logs`** (apenas admin).

### Sistema de Curtidas nos Comentários

**Constraint de Unicidade:**
- Implementado com `@@unique([userId, commentId])` no modelo `CommentLike` do Prisma
- Garante que cada usuário só pode curtir um comentário uma única vez
- Validação no banco de dados impede duplicatas em nível estrutural

**Validação Backend:**
- Rota `POST /comments/:id/like` verifica se o like já existe
- Se existe, remove a curtida (toggle off)
- Se não existe, cria novo like (toggle on)
- Resposta JSON com status: `{ success: true, liked: boolean }`

**Código Reference:**
```typescript
router.post('/:id/like', requireAuth, async (req: Request, res: Response) => {
  const userId = req.session.user!.id;
  const commentId = parseInt(req.params.id);

  const existingLike = await prisma.commentLike.findUnique({
    where: { userId_commentId: { userId, commentId } }
  });

  if (existingLike) {
    await prisma.commentLike.delete({ where: { id: existingLike.id } });
    res.json({ success: true, liked: false });
  } else {
    await prisma.commentLike.create({ data: { userId, commentId } });
    res.json({ success: true, liked: true });
  }
});
```

### Sistema de Múltiplas Imagens

**Processo de Upload:**
1. Usuário faz upload de até 5 imagens ao criar/editar produto
2. Multer processa os arquivos com validação
3. Primeira imagem é automaticamente marcada como principal (`isPrimary: true`)
4. Imagens são armazenadas localmente ou em AWS S3 (configurável)
5. URLs são persistidas no banco com relacionamento `ProductImage`

**Galeria na Página de Detalhes:**
- Imagem principal exibida em destaque
- Miniatura das demais imagens em carrossel
- Clique nas miniaturas alterna a imagem exibida
- Suporte a navegação por setas (próxima/anterior)

**Modelo de Dados:**
```typescript
model ProductImage {
  id           Int      @id @default(autoincrement())
  imageUrl     String   // URL da imagem
  imageStorage String?  // Path de armazenamento local ou S3
  isPrimary    Boolean  @default(false)
  createdAt    DateTime @default(now())
  
  productId    Int
  Product      Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
}
```

### Sistema de Moderação de Comentários (Admin)

**Permissões:**
- Admins podem deletar qualquer comentário inadequado
- Usuários comuns só podem deletar seus próprios comentários
- Validação realizada na rota `DELETE /comments/:id`

**Lógica de Autorização:**
```typescript
const canDelete = comment.userId === req.session.user!.id || req.session.user!.role === 'admin';

if (!canDelete) {
  return res.status(403).json({ error: 'Não autorizado' });
}
```

**Cascade Delete:**
- Ao deletar um comentário, todas as suas curtidas são removidas automaticamente
- Implementado com `onDelete: Cascade` no Prisma

### Upload de Imagens em Comentários

**Características:**
- Upload opcional de imagem junto com comentário
- Arquivo processado por Multer com validação
- Imagem armazenada com UUID para evitar conflitos
- Apenas usuários autenticados podem fazer upload

**Validação:**
- Tipos permitidos: JPEG, PNG, WebP
- Tamanho máximo: configurável (default 5MB)
- Erro retornado em JSON se falhar

---

## Guia de Testes

### Teste 1: Sistema de Curtidas (sem duplicatas)
```bash
1. Faça login como usuário comprador
2. Vá para página de detalhes de um produto
3. Clique em "Curtir" em um comentário → deve adicionar like
4. Clique novamente em "Curtir" → deve remover like
5. Clique pela 3ª vez → deve adicionar like novamente
6. Verifique no banco: SELECT * FROM CommentLike WHERE userId=X AND commentId=Y
   → Resultado esperado: exatamente 1 registro (não duplicado)
```

### Teste 2: Moderação por Admin
```bash
1. Faça login como admin (kethelem@admin.com / kethelem123)
2. Vá para página de detalhes de um produto
3. Localize um comentário inadequado
4. Clique em "Deletar Comentário"
5. Confirmação: comentário removido e likes associados deletados
6. Verifique: nenhuma referência ao comentário permanece
```

### Teste 3: Upload de Imagem em Comentário
```bash
1. Faça login como usuário comprador
2. Vá para página de detalhes do produto
3. Escreva um comentário e selecione uma imagem
4. Clique "Publicar Comentário"
5. Verifique: comentário exibe a imagem anexada
6. Imagem deve estar visível na listagem de comentários
```

### Teste 4: Acesso Sem Autenticação
```bash
1. Abra uma janela anônima do navegador
2. Vá para página de detalhes do produto
3. Tente comentar → deve redirecionar para login ou retornar erro 401
4. Tente curtir → deve redirecionar para login ou retornar erro 401
5. Pode visualizar comentários e curtidas, mas não interagir
```

### Teste 5: Perfil de Comprador
```bash
1. Faça login como comprador
2. Vá para /buyer/profile
3. Preencha: telefone, endereço, cidade, estado, CEP, forma de pagamento
4. Clique "Salvar Perfil"
5. Faça logout e login novamente
6. Verifique: dados foram persistidos no banco
7. Tente acessar perfil de outro comprador → deve bloquear com erro
```

### Teste 6: Perfil de Vendedor
```bash
1. Faça login como vendedor
2. Vá para /seller-dashboard
3. Edite: nome da loja, descrição, telefone, localização, categorias
4. Clique "Salvar Perfil"
5. Vá para /seller-public/{sellerId} → deve exibir perfil público
6. Outros usuários podem visualizar mas não editar
```

---

## Observações Importantes

### Segurança
- Todas as rotas de modificação (`POST`, `PUT`, `DELETE`) requerem autenticação
- Middleware `requireAuth` valida sessão de usuário
- Middleware `requireAdminWeb` valida permissão de administrador
- Senhas são hashadas com `hashPassword()` antes de armazenar

### Validação
- Zod schema para todos os formulários
- Validação no backend garante integridade dos dados
- Mensagens de erro claras retornadas ao frontend

### Performance
- Queries otimizadas com `include` e `select` no Prisma
- Imagens principais carregadas primeiro na listagem
- Relacionamentos carregados conforme necessário

### Banco de Dados
- SQLite para desenvolvimento (simples, sem dependências externas)
- Migrações versionadas em `prisma/migrations/`
- Constraint único `@@unique([userId, commentId])` em `CommentLike`
- Cascade delete em relacionamentos de comentários