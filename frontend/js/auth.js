const passwordStrength = (senha) => {
  return String(senha || '').replace(/\D/g, '').length >= 4 ? 3 : 0;
};

const strengthLabel = (score) => {
  if (score < 3) return { text: 'Mínimo 4 dígitos', colorClass: 'weak', width: '35%', color: '#dc2626' };
  return { text: 'Senha válida', colorClass: 'strong', width: '100%', color: '#16a34a' };
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

const onlyDigits = (valor) => String(valor || '').replace(/\D/g, '');

const formatPhone = (valor) => {
  const digits = onlyDigits(valor).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};

document.getElementById('telefone')?.addEventListener('input', (event) => {
  event.target.value = formatPhone(event.target.value);
});

document.getElementById('whatsapp')?.addEventListener('input', (event) => {
  event.target.value = formatPhone(event.target.value);
});

const checkEmailAvailability = async () => {
  const rawEmail = document.getElementById('email')?.value || '';
  const email = rawEmail.trim().toLowerCase();
  const emailFeedback = document.getElementById('emailFeedback');
  if (!emailFeedback) return { available: true, error: true };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailFeedback.textContent = 'Informe um e-mail válido.';
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
    emailFeedback.textContent = 'Não foi possível verificar o e-mail. Tentando cadastrar mesmo assim...';
    emailFeedback.className = 'email-feedback checking';
    return { available: true, error: true };
  } catch (err) {
    emailFeedback.textContent = 'Não foi possível verificar o e-mail. Tentando cadastrar mesmo assim...';
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
  if (score < 3) return msg('mensagem', 'A senha deve conter no mínimo 4 dígitos.', 'error');

  try {
    await request('/auth/cadastro', { method: 'POST', body: JSON.stringify({ nome, email, senha, whatsapp, termos_aceitos }) });
    msg('mensagem', 'Cadastro criado. Agora você pode acessar a plataforma.');
    e.target.reset();
    updatePasswordStrength();
  } catch (err) { msg('mensagem', err.message, 'error'); }
});

document.getElementById('formRecuperar')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const telefone = onlyDigits(document.getElementById('telefone')?.value || '');
  const nova_senha = document.getElementById('senha').value;
  const senhaConfirm = document.getElementById('senhaConfirm')?.value || '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg('mensagem', 'E-mail em formato inválido.', 'error');
  if (telefone.length < 10) return msg('mensagem', 'Informe o telefone cadastrado.', 'error');
  if (nova_senha !== senhaConfirm) return msg('mensagem', 'As senhas não coincidem.', 'error');
  if (passwordStrength(nova_senha) < 3) return msg('mensagem', 'A senha deve conter no mínimo 4 dígitos.', 'error');

  try {
    await request('/auth/recuperar-senha', { method: 'POST', body: JSON.stringify({ email, telefone, nova_senha }) });
    msg('mensagem', 'Senha alterada com sucesso. Você já pode entrar.');
    e.target.reset();
    updatePasswordStrength();
  } catch (err) {
    msg('mensagem', err.message, 'error');
  }
});

document.getElementById('formLogin')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg('mensagem', 'E-mail em formato inválido.', 'error');

  try {
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) });
    setSession(data);
    location.href = data.usuario.tipo === 'admin' ? '/admin.html' : '/dashboard.html';
  } catch (err) {
    msg('mensagem', err.message, 'error');
  }
});
