function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

async function verifyEmail(token) {
  const messageEl = document.getElementById('verificacaoMensagem');
  const actionsEl = document.getElementById('verificacaoActions');

  if (!token) {
    messageEl.className = 'alert error';
    messageEl.textContent = 'Token de verificação não encontrado. Por favor, use o link enviado por e-mail.';
    return;
  }

  try {
    const data = await request(`/auth/verify?token=${encodeURIComponent(token)}`);
    messageEl.className = 'alert success';
    messageEl.textContent = data.message || 'E-mail verificado com sucesso.';
    actionsEl.style.display = 'block';
  } catch (err) {
    messageEl.className = 'alert error';
    messageEl.textContent = err.message || 'Falha ao verificar o token.';
    actionsEl.style.display = 'block';
  }
}

verifyEmail(getQueryParam('token'));
