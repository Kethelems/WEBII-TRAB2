import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

async function main() {
  // Admin
  await prisma.user.upsert({
    where: { cpf: '00000000000' },
    update: {},
    create: {
      name: 'Kethelem',
      email: 'kethelem@admin.com',
      password: hashPassword('kethelem123'),
      cpf: '00000000000',
      role: 'admin',
      active: true,
      emailVerified: true,
    },
  });
  console.log('Seed: administrador ok');

  // Apagar todos os produtos existentes
  await prisma.product.deleteMany({});
  console.log('Seed: produtos antigos removidos.');

  // Vendedora Elisa
  const elisaEmail = 'elisa@vendedora.com';
  const elisa = await prisma.user.upsert({
    where: { cpf: '11111111111' },
    update: {},
    create: {
      name: 'Elisa',
      email: elisaEmail,
      password: hashPassword('elisa123'),
      cpf: '11111111111',
      role: 'vendedor',
      active: true,
      emailVerified: true,
      SellerProfile: {
        create: {
          storeName: 'Loja da Elisa',
          description: 'Brinquedos e personagens favoritos das crianças com qualidade e carinho.',
          phone: '11999990000',
          city: 'São Paulo',
          state: 'SP',
          categories: 'INFANTIL',
        },
      },
    },
  });

  const produtos = [
    {
      name: 'Barbie Fashionista',
      description: 'Boneca Barbie com roupa e acessórios fashion. A partir de 3 anos.',
      category: 'INFANTIL',
      price: 89.90,
      stock: 20,
    },
    {
      name: 'Barbie Profissões — Médica',
      description: 'Barbie com jaleco e kit médico completo. Estimula o faz de conta.',
      category: 'INFANTIL',
      price: 99.90,
      stock: 15,
    },
    {
      name: 'Pelúcia Stitch Grande',
      description: 'Pelúcia do Stitch macia e fofa, 40 cm. Perfeita para presentear.',
      category: 'INFANTIL',
      price: 129.90,
      stock: 12,
    },
    {
      name: 'Pelúcia Stitch Pequena',
      description: 'Versão compacta da pelúcia do Stitch, 20 cm. Ideal para viagens.',
      category: 'INFANTIL',
      price: 59.90,
      stock: 25,
    },
    {
      name: 'Casa dos Sonhos Barbie',
      description: 'Casinha da Barbie com 3 andares, elevador e mais de 70 acessórios.',
      category: 'INFANTIL',
      price: 499.90,
      stock: 5,
    },
    {
      name: 'Kit Stitch — Mochila + Pelúcia',
      description: 'Combo exclusivo com mochila estampada do Stitch e pelúcia de brinde.',
      category: 'INFANTIL',
      price: 149.90,
      stock: 10,
    },
  ];

  for (const produto of produtos) {
    await prisma.product.create({
      data: { ...produto, userId: elisa.id },
    });
  }

  console.log('Seed: vendedora Elisa ok —', elisaEmail, '/ senha: elisa123');
  console.log('Seed:', produtos.length, 'produtos criados para Elisa.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
