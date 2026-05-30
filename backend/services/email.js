const nodemailer = require('nodemailer');
const { APP_URL } = process.env;

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendVerificationEmail(to, token) {
  const verifyUrl = `${APP_URL || 'http://localhost:3000'}/verificacao.html?token=${token}`;
  const mail = {
    from: process.env.SMTP_FROM || 'Bolão <no-reply@bolao.local>',
    to,
    subject: 'Verifique seu email - Bolão Copa 2026',
    html: `
      <p>Olá,</p>
      <p>Para finalizar seu cadastro no Bolão Copa 2026, clique no link abaixo para verificar seu e-mail:</p>
      <p><a href="${verifyUrl}">Verificar meu e-mail</a></p>
      <p>Se preferir, copie este código de verificação e cole na página de verificação: <strong>${token}</strong></p>
      <p>Link válido por 24 horas.</p>
    `,
  };

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP não configurado. O link de verificação foi registrado no log do servidor.');
    console.log('Verificação para:', to);
    console.log('Link:', verifyUrl);
    console.log('Token:', token);
    return { logged: true, verifyUrl, token };
  }

  const transport = createTransport();
  const info = await transport.sendMail(mail);
  return info;
}

module.exports = { sendVerificationEmail };
