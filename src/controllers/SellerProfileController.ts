import { Request, Response, Router } from 'express';
import prisma from '../config/prisma';
import * as z from 'zod';

const router = Router();

const SellerProfileSchema = z.object({
  storeName: z.string().min(3, 'Nome da loja é obrigatório'),
  description: z.string().min(10, 'Descrição é obrigatória'),
  phone: z.string().min(10, 'Telefone é obrigatório'),
  city: z.string().min(2, 'Cidade é obrigatória'),
  state: z.string().min(2, 'Estado é obrigatório'),
  categories: z.string().min(3, 'Categorias são obrigatórias'),
});

function requireSeller(req: Request, res: Response, next: any) {
  if (!req.session.user || (req.session.user.role !== 'seller' && req.session.user.role !== 'admin')) {
    return res.redirect('/login?error=Acesso restrito a vendedores');
  }
  next();
}

router.get('/profile', requireSeller, async (req: Request, res: Response) => {
  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: req.session.user!.id }
  });

  res.render('seller-profile', {
    profile,
    error: req.query.error,
    success: req.query.success
  });
});

router.post('/profile', requireSeller, async (req: Request, res: Response) => {
  const { success, data, error } = SellerProfileSchema.safeParse(req.body);

  if (!success) {
    return res.redirect(`/seller/profile?error=${encodeURIComponent(error.issues[0].message)}`);
  }

  try {
    await prisma.sellerProfile.upsert({
      where: { userId: req.session.user!.id },
      update: data,
      create: { ...data, userId: req.session.user!.id }
    });

    res.redirect('/seller/profile?success=Perfil atualizado com sucesso');
  } catch (err) {
    res.redirect('/seller/profile?error=Erro ao salvar perfil');
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const sellerId = parseInt(req.params.id);
  
  const seller = await prisma.user.findUnique({
    where: { id: sellerId, role: 'seller' },
    include: {
      SellerProfile: true,
      Products: {
        orderBy: { createdAt: 'desc' },
        take: 6
      }
    }
  });

  if (!seller) {
    return res.status(404).render('error', { message: 'Vendedor não encontrado' });
  }

  res.render('seller-public', { seller });
});

export default router;