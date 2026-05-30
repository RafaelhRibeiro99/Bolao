const passwordStrength = (senha) => {
  let score = 0;
  if (senha.length >= 8) score += 1;
  if (/[A-Z]/.test(senha)) score += 1;
  if (/[a-z]/.test(senha)) score += 1;
  if (/[0-9]/.test(senha)) score += 1;
  if (/[^A-Za-z0-9]/.test(senha)) score += 1;
  return score;
};

const strengthLabel = (score) => {
  if (score <= 1) return { text: 'Muito fraca', colorClass: 'weak', width: '20%', color: '#dc2626' };
  if (score === 2) return { text: 'Fraca', colorClass: 'fair', width: '40%', color: '#f59e0b' };
  if (score === 3) return { text: 'Média', colorClass: 'good', width: '60%', color: '#3b82f6' };
  if (score === 4) return { text: 'Boa', colorClass: 'good', width: '80%', color: '#3b82f6' };
  return { text: 'Forte', colorClass: 'strong', width: '100%', color: '#16a34a' };
};

const updatePasswordStrength = () => {
  const senhaField = document.getElementById('senha');
  const strengthBar = document.getElementById('strengthIndicator');
  const strengthText = document.getElementById('strengthText');
  const strengthContainer = document.getElementById('passwordStrength');
  if (!senhaField || !strengthBar || !strengthText || !strengthContainer) return;
  const senha = senhaField.value;
  if (!senha) {
    strengthContainer.style.display = 'none';
    return;
  }
  const { text, width, colorClass, color } = strengthLabel(passwordStrength(senha));
  strengthContainer.style.display = 'block';
  strengthBar.style.width = width;
  strengthBar.style.backgroundColor = color;
  strengthText.textContent = text;
  strengthText.className = `strength-text ${colorClass}`;
};

const checkEmailAvailability = async () => {
  const rawEmail = document.getElementById('email')?.value || '';
  const email = rawEmail.trim().toLowerCase();
  const emailFeedback = document.getElementById('emailFeedback');
  if (!emailFeedback) return { available: true, error: true };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailFeedback.textContent = 'Informe um email válido.';
    emailFeedback.className = 'email-feedback taken';
    emailFeedback.style.display = 'block';
    return { available: false, error: false };
  }
  emailFeedback.textContent = 'Verificando disponibilidade...';
  emailFeedback.className = 'email-feedback checking';
  emailFeedback.style.display = 'block';
  try {
    const data = await request(`/auth/check-email?email=${encodeURIComponent(email)}`);
    if (typeof data.available === 'boolean') {
      if (data.available) {
        emailFeedback.textContent = 'E-mail disponível para cadastro.';
        emailFeedback.className = 'email-feedback available';
        return { available: true, error: false };
      }
      emailFeedback.textContent = 'E-mail já cadastrado.';
      emailFeedback.className = 'email-feedback taken';
      return { available: false, error: false };
    }
    emailFeedback.textContent = 'Não foi possível verificar o email. Tentando cadastrar mesmo assim...';
    emailFeedback.className = 'email-feedback checking';
    return { available: true, error: true };
  } catch (err) {
    emailFeedback.textContent = 'Não foi possível verificar o email. Tentando cadastrar mesmo assim...';
    emailFeedback.className = 'email-feedback checking';
    return { available: true, error: true };
  }
};

document.getElementById('email')?.addEventListener('blur', checkEmailAvailability);
document.getElementById('senha')?.addEventListener('input', updatePasswordStrength);

document.getElementById('formCadastro')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('nome').value;
  const rawEmail = document.getElementById('email').value;
  const email = rawEmail.trim().toLowerCase();
  const whatsapp = document.getElementById('whatsapp')?.value || null;
  const senha = document.getElementById('senha').value;
  const senhaConfirm = document.getElementById('senhaConfirm')?.value || '';
  const termos_aceitos = Boolean(document.getElementById('termos')?.checked);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg('mensagem', 'E-mail em formato inválido.', 'error');
  if (senha !== senhaConfirm) return msg('mensagem', 'As senhas não coincidem.', 'error');
  const emailCheck = await checkEmailAvailability();
  if (!emailCheck.available && !emailCheck.error) return msg('mensagem', 'E-mail já cadastrado.', 'error');

  const score = passwordStrength(senha);
  if (score < 3) return msg('mensagem', 'Senha muito fraca. Use pelo menos 8 caracteres, letras e números.', 'error');

  try {
    await request('/auth/cadastro', { method: 'POST', body: JSON.stringify({ nome, email, senha, whatsapp, termos_aceitos }) });
    msg('mensagem', 'Cadastro criado. Agora você pode acessar a plataforma.');
    e.target.reset();
    updatePasswordStrength();
  } catch (err) { msg('mensagem', err.message, 'error'); }
});

document.getElementById('formLogin')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;
  // validações client-side

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg('mensagem', 'E-mail em formato inválido.', 'error');

  try {
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) });
    setSession(data);
    location.href = data.usuario.tipo === 'admin' ? '/admin.html' : '/dashboard.html';
  } catch (err) {
    msg('mensagem', err.message, 'error');
    // Verificação de email é opcional em ambiente de teste
  }
});
