import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;

  const account = await nodemailer.createTestAccount();

  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: account.user, pass: account.pass },
  });

  console.log(`[EMAIL] Conta Ethereal: ${account.user} — pré-visualização em https://ethereal.email`);

  return transporter;
}

export async function enviarCodigoVerificacao(email: string, nome: string, codigo: string): Promise<void> {
  const t = await getTransporter();
  const info = await t.sendMail({
    from: '"MarketMVP" <noreply@marketmvp.com>',
    to: email,
    subject: 'Código de verificação - MarketMVP',
    html: `
      <h2>Olá, ${nome}!</h2>
      <p>Seu código de verificação é:</p>
      <h1 style="letter-spacing:8px">${codigo}</h1>
      <p>Este código expira em 30 minutos.</p>
    `,
  });

  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) console.log(`[EMAIL] Pré-visualização: ${preview}`);
}
