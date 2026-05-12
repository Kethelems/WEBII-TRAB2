import { NextFunction, Request, Response, Router } from 'express';
import prisma from '../config/prisma';
import { productImageUpload, removeLocalProductImage } from '../config/upload';
import { storeProductImage } from '../services/product-image-storage';
import { isProductCategory, getProductCategoryLabel } from '../constants/product-categories';

const router = Router();

function requireSeller(req: Request, res: Response, next: NextFunction) {
  const role = req.session.user?.role;

  if (!req.session.user || (role !== 'vendedor' && role !== 'admin')) {
    if (req.accepts('html')) {
      return res.redirect('/login?error=Entre como vendedor para publicar produtos.');
    }

    return res.status(403).json({ message: 'Seller login required' });
  }

  next();
}

function uploadProductImages(req: Request, res: Response, next: NextFunction) {
  // TRABALHO II: Suporte a múltiplas imagens (até 5 por produto)
  productImageUpload.array('images', 5)(req, res, (error: unknown) => {
    if (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel processar as imagens enviadas.';

      if (req.accepts('html')) {
        return res.redirect(`/seller-dashboard?error=${encodeURIComponent(message)}`);
      }

      return res.status(400).json({ message });
    }

    next();
  });
}

router.get('/', async (req: Request, res: Response) => {
  const products = await prisma.product.findMany({
    include: {
      User: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      ProductImages: {
        orderBy: { isPrimary: 'desc' },
        take: 1
      }
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return res.json(products);
});

router.get('/:id', async (req: Request, res: Response) => {
  const productId = parseInt(req.params.id);
  
  // TRABALHO II: Página de detalhes rica com galeria, vendedor e comentários
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      User: {
        include: {
          SellerProfile: true
        }
      },
      ProductImages: {
        orderBy: { isPrimary: 'desc' }
      },
      Comments: {
        include: {
          User: { select: { name: true } },
          CommentLikes: true
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!product) {
    return res.status(404).render('error', { message: 'Produto não encontrado' });
  }

  // TRABALHO II: Cálculo do total de curtidas nos comentários
  const totalLikes = product.Comments.reduce((sum, comment) => sum + comment.CommentLikes.length, 0);
  const userLikes = req.session.user ? 
    product.Comments.reduce((acc, comment) => {
      const userLiked = comment.CommentLikes.some(like => like.userId === req.session.user!.id);
      if (userLiked) acc[comment.id] = true;
      return acc;
    }, {} as Record<number, boolean>) : {};

  res.render('product-details', {
    product,
    totalLikes,
    userLikes,
    getProductCategoryLabel
  });
});

router.post('/', requireSeller, uploadProductImages, async (req: Request, res: Response) => {
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();
  const category = String(req.body.category || '').trim();
  const price = Number.parseFloat(String(req.body.price || '').replace(',', '.'));
  const stock = Number.parseInt(String(req.body.stock || ''), 10);

  if (!name || !description || !category || Number.isNaN(price) || Number.isNaN(stock)) {
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        await removeLocalProductImage(file);
      }
    }

    if (req.accepts('html')) {
      return res.redirect('/seller-dashboard?error=Preencha todos os campos do produto.');
    }

    return res.status(400).json({ message: 'Name, description, category, price and stock are required' });
  }

  if (!isProductCategory(category)) {
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        await removeLocalProductImage(file);
      }
    }

    if (req.accepts('html')) {
      return res.redirect('/seller-dashboard?error=Selecione uma categoria valida.');
    }

    return res.status(400).json({ message: 'Invalid category' });
  }

  try {
    const product = await prisma.product.create({
      data: {
        name,
        description,
        category,
        price,
        stock,
        userId: req.session.user!.id,
      }
    });

    // Upload e processamento de múltiplas imagens
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const storedImage = await storeProductImage(file);
        
        if (storedImage) {
          await prisma.productImage.create({
            data: {
              imageUrl: storedImage.imageUrl,
              imageStorage: storedImage.imageStorage,
              isPrimary: i === 0, // TRABALHO II: Primeira imagem é definida como principal
              productId: product.id
            }
          });
        }
      }
    }

  } catch (error) {
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        await removeLocalProductImage(file);
      }
    }
    console.error(error);

    if (req.accepts('html')) {
      return res.redirect('/seller-dashboard?error=Nao foi possivel publicar o produto.');
    }

    return res.status(500).json({ message: 'Error creating product' });
  }

  if (req.accepts('html')) {
    return res.redirect('/seller-dashboard?success=Produto publicado com sucesso.');
  }

  return res.json({ message: 'Product created successfully' });
});

router.post('/:id/images', requireSeller, uploadProductImages, async (req: Request, res: Response) => {
  const productId = parseInt(req.params.id);

  const product = await prisma.product.findUnique({ where: { id: productId } });

  if (!product) {
    return res.status(404).json({ message: 'Produto não encontrado' });
  }

  if (req.session.user!.role !== 'admin' && product.userId !== req.session.user!.id) {
    return res.status(403).json({ message: 'Não autorizado' });
  }

  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return res.redirect(`/seller-dashboard?error=Nenhuma imagem enviada.`);
  }

  const existingCount = await prisma.productImage.count({ where: { productId } });
  const hasPrimary = existingCount === 0;

  for (let i = 0; i < req.files.length; i++) {
    const file = req.files[i];
    const storedImage = await storeProductImage(file);
    if (storedImage) {
      await prisma.productImage.create({
        data: {
          imageUrl: storedImage.imageUrl,
          imageStorage: storedImage.imageStorage,
          isPrimary: hasPrimary && i === 0,
          productId,
        },
      });
    }
  }

  return res.redirect(`/seller-dashboard?success=Imagens adicionadas com sucesso.`);
});

export default router;
