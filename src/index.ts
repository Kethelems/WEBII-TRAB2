// CARREGANDO AS VARIAVEIS DE AMBIENTE
import dotenv from 'dotenv';
dotenv.config();

import path from 'node:path';
import express, { Request, Response } from 'express';
import session from 'express-session';
import prisma from './config/prisma';
import { getUploadDriverLabel } from './config/upload';
import {
  findMatchingProductCategories,
  getProductCategoryLabel,
  isProductCategory,
  PRODUCT_CATEGORY_OPTIONS,
} from './constants/product-categories';
import { hashPassword, verifyPassword } from './utils/password';
import { enviarCodigoVerificacao } from './config/email';
import { auditLog } from './middleware/auditLog';

declare module 'express-session' {
  interface SessionData {
    urls: string[];
    user?: {
      id: number;
      name: string;
      email: string;
      role: string;
    };
  }
}

const app = express();
const port = process.env.PORT || 3333;

const PUBLIC_SIGNUP_ROLES = ['comprador', 'vendedor'];
const LOGIN_ROLES = ['comprador', 'vendedor', 'admin'];

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    comprador: 'Comprador',
    vendedor: 'Vendedor',
    admin: 'Administrador',
  };

  return labels[role] || role;
}

function redirectWithMessage(path: string, type: 'error' | 'success', message: string) {
  return `${path}?${type}=${encodeURIComponent(message)}`;
}

function getMessage(req: Request, name: 'error' | 'success') {
  const value = req.query[name];

  return typeof value === 'string' ? value : undefined;
}

function gerarCodigoVerificacao(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function requireAuthSession(req: Request, res: Response, next: express.NextFunction) {
  if (!req.session.user) {
    return res.redirect(redirectWithMessage('/login', 'error', 'Faça login para continuar.'));
  }

  next();
}

function requireAdminWeb(req: Request, res: Response, next: express.NextFunction) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).render('error-access', {
      message: 'Acesso restrito a administradores.',
    });
  }

  next();
}

function requireSeller(req: Request, res: Response, next: express.NextFunction) {
  const role = req.session.user?.role;

  if (!req.session.user || (role !== 'vendedor' && role !== 'admin')) {
    return res.redirect(redirectWithMessage('/login', 'error', 'Entre como vendedor para acessar o painel.'));
  }

  next();
}

app.set('view engine', 'ejs');
app.set('views', './src/views');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// TUDO ESTÁTICO É SERVIDO PUBLICAMENTE
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'marketmvp-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    // secure: true // em prod
  }
}));

app.use((req, res, next) => {
  req.session.urls = req.session.urls || [];
  req.session.urls.push(req.url);
  res.locals.user = req.session.user;
  next();
});

app.get('/', async (req, res) => {
  // localhost:3333/ ?search=celular
  const search = String(req.query.search || '').trim();
  const category = String(req.query.category || '').trim();
  const selectedCategory = isProductCategory(category) ? category : '';
  const matchingCategories = findMatchingProductCategories(search);

  const products = await prisma.product.findMany({
    where: {
      ...(selectedCategory
        ? {
            category: selectedCategory,
          }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
              { category: { contains: search } },
              ...(matchingCategories.length > 0
                ? [{ category: { in: matchingCategories } }]
                : []),
            ],
          }
        : {}),
    },
    include: {
      User: {
        include: {
          SellerProfile: true
        }
      },
      ProductImages: {
        orderBy: { isPrimary: 'desc' },
        take: 1
      },
      Comments: {
        include: {
          CommentLikes: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.render('home', {
    products,
    search,
    selectedCategory,
    categoryOptions: PRODUCT_CATEGORY_OPTIONS,
    roleLabel,
    featuredCategories: PRODUCT_CATEGORY_OPTIONS.slice(0, 4),
    getProductCategoryLabel,
  });
});

app.get('/signup', (req, res) => {
  if (req.session.user) return res.redirect('/');

  res.render('signup', {
    error: getMessage(req, 'error'),
    values: {},
  });
});

import * as z from 'zod';
const Signup = z.object({
  name: z.string().min(3, 'O nome é obrigatório. Minimo de 3 caracteres.').max(100, 'O nome deve ter no máximo 100 caracteres.'),
  cpf: z.string()
    .min(11, 'O CPF é obrigatório. Deve conter 11 caracteres.').max(11, 'O CPF deve conter 11 caraceres'),
  email: z.email('Email inválido.'),
  password: z.string().min(6, 'A senha é obrigatória. Minimo de 6 caracteres.').max(100, 'A senha deve ter no máximo 100 caracteres.'),
  confirmPassword: z.string().min(6, 'A confirmação de senha é obrigatória. Minimo de 6 caracteres.').max(100, 'A confirmação de senha deve ter no máximo 100 caracteres.'),
  role: z.enum(['comprador', 'vendedor'], 'Escolha comprador ou vendedor para criar sua conta.'),

}).refine(data => data.password === data.confirmPassword, {
  message: 'As senhas informadas nao conferem.'
});

app.post('/signup', auditLog('Cadastro de novo usuário'), async (req, res) => {
  const payload = req.body;
  const { success, data, error } = Signup.safeParse(payload);

  if (!success) {
    return res.render('signup', {
      error: error.issues[0].message,
      values: payload,
    });
  }

  const emailNorm = data.email.trim().toLowerCase();

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ cpf: data.cpf }, { email: emailNorm }],
    },
  });

  if (existingUser) {
    return res.status(400).render('signup', {
      error: 'Ja existe uma conta com este CPF ou email.',
      values: payload,
    });
  }

  const { confirmPassword, ...userData } = data;
  const code = gerarCodigoVerificacao();
  const expires = new Date(Date.now() + 30 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      name: userData.name,
      email: emailNorm,
      cpf: userData.cpf,
      password: hashPassword(data.password),
      role: userData.role,
      active: true,
      emailVerified: false,
      verificationCode: code,
      verificationExpires: expires,
    },
  });

  try {
    await enviarCodigoVerificacao(user.email, user.name, code);
  } catch (err) {
    console.error(err);
    console.log(`[DEV] Código de verificação para ${user.email}: ${code}`);
  }

  return res.redirect(`/verificar-email?email=${encodeURIComponent(user.email)}`);
});

app.get('/verificar-email', (req, res) => {
  if (req.session.user) return res.redirect('/');

  const email = String(req.query.email || '').trim().toLowerCase();

  if (!email) {
    return res.redirect('/signup');
  }

  res.render('verify-email', { email, erro: null, sucesso: null });
});

app.post('/verificar-email', auditLog('Verificação de e-mail'), async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const codigo = String(req.body.codigo || '').trim();

  const usuario = await prisma.user.findUnique({ where: { email } });

  if (!usuario) {
    return res.render('verify-email', { email, erro: 'Usuário não encontrado.', sucesso: null });
  }

  if (!usuario.verificationCode || !usuario.verificationExpires) {
    return res.render('verify-email', { email, erro: 'Nenhum código pendente.', sucesso: null });
  }

  if (new Date() > usuario.verificationExpires) {
    return res.render('verify-email', { email, erro: 'Código expirado. Solicite um novo.', sucesso: null });
  }

  if (usuario.verificationCode !== codigo) {
    return res.render('verify-email', { email, erro: 'Código inválido.', sucesso: null });
  }

  await prisma.user.update({
    where: { id: usuario.id },
    data: {
      emailVerified: true,
      verificationCode: null,
      verificationExpires: null,
    },
  });

  return res.redirect(
    `/login?success=${encodeURIComponent('E-mail verificado. Faça login com sua conta.')}`
  );
});

app.post('/reenviar-codigo', auditLog('Reenvio de código de verificação'), async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const usuario = await prisma.user.findUnique({ where: { email } });

  if (!usuario) {
    return res.render('verify-email', { email, erro: 'Usuário não encontrado.', sucesso: null });
  }

  if (usuario.emailVerified) {
    return res.render('verify-email', {
      email,
      erro: null,
      sucesso: 'Este e-mail já está verificado. Faça login.',
    });
  }

  const code = gerarCodigoVerificacao();
  const expires = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.user.update({
    where: { id: usuario.id },
    data: {
      verificationCode: code,
      verificationExpires: expires,
    },
  });

  try {
    await enviarCodigoVerificacao(usuario.email, usuario.name, code);
  } catch (err) {
    console.error(err);
    console.log(`[DEV] Novo código para ${usuario.email}: ${code}`);
  }

  return res.render('verify-email', {
    email,
    erro: null,
    sucesso: 'Novo código enviado para seu e-mail.',
  });
});

app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');

  res.render('login', {
    error: getMessage(req, 'error'),
    success: getMessage(req, 'success'),
    values: {},
  });
});

app.post('/login', auditLog('Tentativa de login'), async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const role = String(req.body.role || 'comprador');
  const values = { email, role };

  if (!email || !password || !role) {
    return res.status(400).render('login', {
      error: 'Informe email, senha e tipo de conta.',
      success: undefined,
      values,
    });
  }

  if (!LOGIN_ROLES.includes(role)) {
    return res.status(400).render('login', {
      error: 'Tipo de conta invalido.',
      success: undefined,
      values,
    });
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).render('login', {
      error: 'Email ou senha invalidos.',
      success: undefined,
      values,
    });
  }

  if (!user.active) {
    return res.status(401).render('login', {
      error: 'Conta desativada. Entre em contato com um administrador.',
      success: undefined,
      values,
    });
  }

  if (user.role !== 'admin' && !user.emailVerified) {
    return res.status(401).render('login', {
      error: 'Confirme seu e-mail antes de entrar. Verifique a caixa de entrada ou a pré-visualização no terminal.',
      success: undefined,
      values,
    });
  }

  if (user.role !== role) {
    return res.status(401).render('login', {
      error: `Esta conta esta cadastrada como ${roleLabel(user.role)}.`,
      success: undefined,
      values,
    });
  }

  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  if (user.role === 'admin') {
    return res.redirect('/admin');
  }

  if (user.role === 'vendedor') {
    return res.redirect('/seller-dashboard');
  }

  return res.redirect('/');
});

app.post('/logout', auditLog('Logout'), (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/seller-dashboard', requireSeller, async (req, res) => {
  const products = await prisma.product.findMany({
    where: req.session.user!.role === 'admin'
      ? undefined
      : {
          userId: req.session.user!.id,
        },
    include: {
      ProductImages: {
        orderBy: { isPrimary: 'desc' },
        take: 1,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.render('seller-dashboard', {
    products,
    error: getMessage(req, 'error'),
    success: getMessage(req, 'success'),
    uploadDriverLabel: getUploadDriverLabel(),
    categoryOptions: PRODUCT_CATEGORY_OPTIONS,
    getProductCategoryLabel,
  });
});

app.get('/admin', requireAuthSession, requireAdminWeb, async (req, res) => {
  const usuarios = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });

  res.render('admin', {
    user: req.session.user!,
    usuarios,
  });
});

app.get('/admin/logs', requireAuthSession, requireAdminWeb, async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  res.render('admin-logs', {
    user: req.session.user!,
    logs,
  });
});

app.post(
  '/admin/usuarios/:id/status',
  requireAuthSession,
  requireAdminWeb,
  auditLog('Alteração de status de usuário'),
  async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const alvo = await prisma.user.findUnique({ where: { id } });

    if (!alvo || alvo.id === req.session.user!.id) {
      return res.redirect('/admin');
    }

    await prisma.user.update({
      where: { id },
      data: { active: !alvo.active },
    });

    res.redirect('/admin');
  }
);

import usersController from './controllers/UsersController';
app.use('/users', usersController);

import productsController from './controllers/ProductsController';
app.use('/products', productsController);

import buyerProfileController from './controllers/BuyerProfileController';
app.use('/buyer', buyerProfileController);

import sellerProfileController from './controllers/SellerProfileController';
app.use('/seller', sellerProfileController);

import commentsController from './controllers/CommentsController';
app.use('/comments', commentsController);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
