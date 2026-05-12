# 🎬 ROTEIRO - TRABALHO II (15 minutos)
**ESTRUTURA: 5 min demonstração + 10 min código**

---

## 🎯 PARTE 1: DEMONSTRAÇÃO (5 minutos)

### 1. Introdução (20 segundos)
"Apresentando o Trabalho II — Evolução do Marketplace. Partindo da base do Trabalho I com autenticação, perfis e upload de imagem, implementei as 5 funcionalidades solicitadas."

---

### 2. Comentários + Curtidas (2 minutos)
*(maior peso na avaliação — 4,0 pts)*

- Abrir um produto na home → página de detalhes
- **Sem login:** mostrar que os botões de comentar/curtir não aparecem
- Fazer login como comprador
- Voltar ao produto → escrever um comentário com foto anexada
- Mostrar: autor, data/hora, imagem no comentário
- Curtir o comentário → coração fica vermelho, contagem sobe
- Curtir de novo → remove a curtida (toggle)
- Falar: *"Comentários com foto opcional, curtidas com toggle — um usuário não consegue curtir duas vezes o mesmo comentário, garantido no backend e no banco"*

---

### 3. Perfil do Comprador (1 minuto)
*(1,0 pt)*

- Logado como comprador → ir em "Meu Perfil"
- Preencher: telefone, endereço, cidade, estado, CEP, forma de pagamento
- Salvar → mostrar mensagem de sucesso
- Tentar acessar a rota com outro usuário → mostrar bloqueio
- Falar: *"Perfil completo com validação no backend, acesso restrito ao próprio usuário"*

---

### 4. Perfil do Vendedor (1 minuto)
*(1,0 pt)*

- Logout → login como vendedor (elisa@vendedora.com / elisa123)
- Ir em "Meu Perfil" → preencher dados da loja
- Campos: nome da loja, descrição, telefone, cidade, estado, categorias
- Salvar → voltar à home → clicar no nome da Elisa em um produto
- Mostrar o perfil público da loja
- Falar: *"Perfil privado editável pelo vendedor e perfil público visível para todos"*

---

### 5. Múltiplas Fotos + Tela de Detalhes (1 minuto)
*(1,5 pt)*

- No painel do vendedor → criar produto com 3 fotos
- Ir na página de detalhes do produto
- Mostrar: galeria com miniaturas, clicar nas miniaturas trocando a imagem principal
- Mostrar: breadcrumb, info do vendedor, total de curtidas
- Falar: *"Até 5 fotos por produto, primeira definida como principal, página de detalhes completa"*

---

## 💻 PARTE 2: CÓDIGO (10 minutos)

---

### 6. Schema do Banco — Novos Modelos (2 minutos)

Abrir `prisma/schema.prisma` e mostrar:

```prisma
model BuyerProfile {
  phone         String
  street        String
  city          String
  state         String
  zipCode       String
  paymentMethod String
  userId        Int    @unique
}

model SellerProfile {
  storeName   String
  description String
  phone       String
  city        String
  state       String
  categories  String
  userId      Int    @unique
}

model ProductImage {
  imageUrl  String
  isPrimary Boolean @default(false)
  productId Int
}

model Comment {
  content   String
  imageUrl  String?
  userId    Int
  productId Int
}

model CommentLike {
  userId    Int
  commentId Int
  @@unique([userId, commentId]) // PREVINE DUPLICATAS NO BANCO
}
```

- Falar: *"5 novos modelos. O destaque é o `@@unique` no CommentLike — garante no nível do banco que um usuário não curte o mesmo comentário duas vezes"*

---

### 7. Sistema de Curtidas — CommentsController (2 minutos)

Abrir `src/controllers/CommentsController.ts` e mostrar a rota de like:

```typescript
router.post('/:id/like', requireAuth, async (req, res) => {
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

- Falar: *"Toggle de curtida — se já existe remove, se não existe cria. O `requireAuth` garante que só usuários logados chegam aqui"*

---

### 8. Sistema de Comentários (2 minutos)

Ainda no `CommentsController.ts`, mostrar criação de comentário:

```typescript
router.post('/', requireAuth, uploadCommentImage, async (req, res) => {
  const storedImage = req.file ? await storeProductImage(req.file) : null;

  await prisma.comment.create({
    data: {
      content: data.content,
      imageUrl: storedImage?.imageUrl ?? null,
      userId: req.session.user!.id,
      productId: data.productId,
    }
  });
});
```

E a lógica de exclusão com controle de acesso:

```typescript
router.delete('/:id', requireAuth, async (req, res) => {
  const canDelete = comment.userId === req.session.user!.id
                 || req.session.user!.role === 'admin';

  if (!canDelete) {
    return res.status(403).json({ error: 'Não autorizado' });
  }

  await prisma.comment.delete({ where: { id: commentId } });
});
```

- Falar: *"Foto opcional no comentário, autor e admin podem excluir, outros usuários recebem 403"*

---

### 9. Múltiplas Imagens — ProductsController (2 minutos)

Abrir `src/controllers/ProductsController.ts`:

```typescript
// Upload de até 5 imagens
productImageUpload.array('images', 5)

// Salvar cada imagem, primeira como principal
for (let i = 0; i < req.files.length; i++) {
  const storedImage = await storeProductImage(req.files[i]);

  await prisma.productImage.create({
    data: {
      imageUrl: storedImage.imageUrl,
      isPrimary: i === 0,
      productId: product.id,
    }
  });
}

// Consulta otimizada na página de detalhes
const product = await prisma.product.findUnique({
  include: {
    User: { include: { SellerProfile: true } },
    ProductImages: { orderBy: { isPrimary: 'desc' } },
    Comments: {
      include: { User: true, CommentLikes: true },
      orderBy: { createdAt: 'desc' }
    }
  }
});
```

- Falar: *"Primeira imagem vira principal automaticamente, consulta traz tudo em uma só query com includes encadeados"*

---

### 10. Perfis — Validação com Zod + Upsert (1 minuto)

Abrir `BuyerProfileController.ts` ou `SellerProfileController.ts`:

```typescript
// Validação com Zod
const BuyerProfileSchema = z.object({
  phone:         z.string().min(10),
  street:        z.string().min(5),
  city:          z.string().min(2),
  state:         z.string().length(2),
  zipCode:       z.string().length(8),
  paymentMethod: z.string().min(3),
});

// Upsert — cria se não existe, atualiza se já existe
await prisma.buyerProfile.upsert({
  where:  { userId: req.session.user!.id },
  update: data,
  create: { ...data, userId: req.session.user!.id },
});
```

- Falar: *"Validação no backend com Zod antes de qualquer operação no banco. Upsert resolve criar e editar com uma única operação"*

---

### 11. Conclusão (30 segundos)

*"Todas as 5 funcionalidades implementadas: perfil do comprador, perfil do vendedor, múltiplas fotos, página de detalhes rica e sistema de comentários com curtidas. Controle de acesso em todas as rotas, validação no backend e constraint no banco."*
