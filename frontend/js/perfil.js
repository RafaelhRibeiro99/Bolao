protegerPagina(false);

let perfilAtual = {};

function atualizarPreviewAvatar(usuario = {}) {
  const avatarEl = document.getElementById('perfilAvatar');
  avatarEl.innerHTML = renderAvatarUsuario(usuario, { size: 'lg' });
}

async function carregarPerfil() {
  await carregarAvatarFaces();
  const usuario = await request('/me');
  perfilAtual = usuario;
  document.getElementById('nomeExibicao').value = usuario.nome_exibicao || usuario.nome || '';
  document.getElementById('whatsappPerfil').value = usuario.whatsapp || '';
  document.getElementById('pixPerfil').value = usuario.pix_chave || '';
  preencherControlesAvatar(document.getElementById('avatarControls'), usuario);
  atualizarPreviewAvatar(usuario);

  const nomeEl = document.getElementById('perfilNome');
  nomeEl.textContent = usuario.nome_exibicao || usuario.nome || 'Participante';
  nomeEl.className = '';
}

document.getElementById('formPerfil')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome_exibicao = document.getElementById('nomeExibicao').value;
  const whatsapp = document.getElementById('whatsappPerfil').value;
  const pix_chave = document.getElementById('pixPerfil').value;
  const avatar = null;
  const avatarConfigForm = lerControlesAvatar();
  try {
    await request('/perfil', { method: 'PUT', body: JSON.stringify({ nome_exibicao, whatsapp, pix_chave, avatar, ...avatarConfigForm }) });
    await carregarPerfil();
    msg('mensagemPerfil', 'Perfil atualizado.');
  } catch (err) {
    msg('mensagemPerfil', err.message, 'error');
  }
});

document.getElementById('avatarControls')?.addEventListener('click', (e) => {
  const option = e.target.closest('[data-avatar-key]');
  if (!option) return;
  const input = document.getElementById(option.dataset.avatarKey);
  if (!input) return;
  input.value = option.dataset.avatarValue;
  option.parentElement.querySelectorAll('.avatar-option, .avatar-face-option').forEach((btn) => btn.classList.remove('selected'));
  option.classList.add('selected');
  atualizarPreviewAvatar({ ...perfilAtual, ...lerControlesAvatar() });
});

carregarPerfil().catch((err) => msg('mensagemPerfil', err.message, 'error'));
