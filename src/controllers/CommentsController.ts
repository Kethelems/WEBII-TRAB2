import { Request, Response, Router } from 'express';
import prisma from '../config/prisma';
import { productImageUpload } from '../config/upload';
import { storeProductImage } from '../services/product-image-storage';
import * as z from 'zod';

const router = Router();

const CommentSchema = z.object({
  content: z.string().min(1, 'Comentário é obrigatório'),
  productId: z.string().transform(val => parseInt(val))
});

function requireAuth(req: Request, res: Response, next: any) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Login necessário' });
  }
  next();
}

function uploadCommentImage(req: Request, res: Response, next: any) {
  productImageUpload.single('image')(req, res, (error: unknown) => {
    if (error) {
      console.error('Upload error:', error);
    }
    next();
  });
}

router.post('/', requireAuth, uploadCommentImage, async (req: Request, res: Response) => {
  const { success, data, error } = CommentSchema.safeParse(req.body);

  if (!success) {
    return res.status(400).json({ error: error.issues[0].message });
  }

  try {
    const storedImage = req.file ? await storeProductImage(req.file) : null;

    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        productId: data.productId,
        userId: req.session.user!.id,
        imageUrl: storedImage?.imageUrl,
        imageStorage: storedImage?.imageStorage
      },
      include: {
        User: { select: { name: true } },
        CommentLikes: true
      }
    });

    res.json({ success: true, comment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar comentário' });
  }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const commentId = parseInt(req.params.id);
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Conteúdo é obrigatório' });
  }

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment || comment.userId !== req.session.user!.id) {
      return res.status(403).json({ error: 'Não autorizado' });
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { content },
      include: {
        User: { select: { name: true } },
        CommentLikes: true
      }
    });

    res.json({ success: true, comment: updatedComment });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar comentário' });
  }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const commentId = parseInt(req.params.id);

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }

    const canDelete = comment.userId === req.session.user!.id || req.session.user!.role === 'admin';
    
    if (!canDelete) {
      return res.status(403).json({ error: 'Não autorizado' });
    }

    await prisma.comment.delete({
      where: { id: commentId }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir comentário' });
  }
});

router.post('/:id/like', requireAuth, async (req: Request, res: Response) => {
  const commentId = parseInt(req.params.id);
  const userId = req.session.user!.id;

  try {
    const existingLike = await prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } }
    });

    if (existingLike) {
      await prisma.commentLike.delete({
        where: { id: existingLike.id }
      });
      res.json({ success: true, liked: false });
    } else {
      await prisma.commentLike.create({
        data: { userId, commentId }
      });
      res.json({ success: true, liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Erro ao curtir comentário' });
  }
});

export default router;