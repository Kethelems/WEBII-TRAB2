import { Request, Response, Router } from 'express';
import prisma from '../config/prisma';
import * as z from 'zod';

const router = Router();

// TRABALHO II: Schema de validação para perfil do comprador
const BuyerProfileSchema = z.object({
  phone: z.string().min(10, 'Telefone é obrigatório'),
  street: z.string().min(5, 'Endereço é obrigatório'),
  city: z.string().min(2, 'Cidade é obrigatória'),
  state: z.string().min(2, 'Estado é obrigatório'),
  zipCode: z.string().min(8, 'CEP é obrigatório'),
  paymentMethod: z.string().min(3, 'Forma de pagamento é obrigatória'),
});

function requireBuyer(req: Request, res: Response, next: any) {
  // TRABALHO II: Controle de acesso restrito ao comprador
  if (!req.session.user || req.session.user.role !== 'buyer') {
    return res.redirect('/login?error=Acesso restrito a compradores');
  }
  next();
}

router.get('/profile', requireBuyer, async (req: Request, res: Response) => {
  const profile = await prisma.buyerProfile.findUnique({
    where: { userId: req.session.user!.id }
  });

  res.render('buyer-profile', {
    profile,
    error: req.query.error,
    success: req.query.success
  });
});

router.post('/profile', requireBuyer, async (req: Request, res: Response) => {
  const { success, data, error } = BuyerProfileSchema.safeParse(req.body);

  if (!success) {
    return res.redirect(`/buyer/profile?error=${encodeURIComponent(error.issues[0].message)}`);
  }

  try {
    // TRABALHO II: Upsert permite criar ou atualizar o perfil
    await prisma.buyerProfile.upsert({
      where: { userId: req.session.user!.id },
      update: data,
      create: { ...data, userId: req.session.user!.id }
    });

    res.redirect('/buyer/profile?success=Perfil atualizado com sucesso');
  } catch (err) {
    res.redirect('/buyer/profile?error=Erro ao salvar perfil');
  }
});

export default router;