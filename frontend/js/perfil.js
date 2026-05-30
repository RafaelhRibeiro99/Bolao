protegerPagina(false);

let perfilAtual = {};

function raridadeClass(grau) {
  return `achievement-${String(grau || 'comum').toLowerCase()}`;
}

function rewardClass(valor, prefixo) {
  const classe = String(valor || '');
  return classe.startsWith(prefixo) && /^[a-z0-9_]+$/.test(classe) ? classe : '';
}

function tituloClasses(usuario) {
  return [
    'badge',
    'badge-premium',
    'titulo-equipado',
    rewardClass(usuario.moldura, 'moldura_') ? `titulo-${rewardClass(usuario.moldura, 'moldura_')}` : '',
    rewardClass(usuario.aura, 'aura_') ? `titulo-${rewardClass(usuario.aura, 'aura_')}` : '',
    rewardClass(usuario.efeito_nome, 'efeito_') ? `titulo-${rewardClass(usuario.efeito_nome, 'efeito_')}` : '',
  ].filter(Boolean).join(' ');
}

function nomeClasses(usuario) {
  return [
    rewardClass(usuario.efeito_nome, 'efeito_'),
    rewardClass(usuario.aura, 'aura_') ? `nome-${rewardClass(usuario.aura, 'aura_')}` : '',
  ].filter(Boolean).join(' ');
}

function aplicarRecompensasNoAvatar(container, usuario) {
  const classeMoldura = rewardClass(usuario.moldura, 'moldura_');
  const classeAura = rewardClass(usuario.aura, 'aura_');
  const avatar2d = container.querySelector('.avatar2d');
  if (classeMoldura) avatar2d?.classList.add(classeMoldura);
  if (classeAura) avatar2d?.classList.add(classeAura);
}

function atualizarPreviewAvatar(usuario = {}) {
  const avatarEl = document.getElementById('perfilAvatar');
  avatarEl.innerHTML = renderAvatarUsuario(usuario, { size: 'lg' });
  aplicarRecompensasNoAvatar(avatarEl, usuario);
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
  nomeEl.className = nomeClasses(usuario);

  const tituloEl = document.getElementById('perfilTitulo');
  tituloEl.textContent = usuario.titulo_ativo
    ? `${usuario.emoji_ativo || ''} ${usuario.titulo_ativo}`.trim()
    : 'Sem título';
  tituloEl.className = usuario.titulo_ativo ? tituloClasses(usuario) : 'badge';

  const recentesEl = document.getElementById('perfilRecentes');
  recentesEl.innerHTML = (usuario.conquistas_recentes || []).map((conquista) => `
    <span class="badge ${raridadeClass(conquista.grau)}">${conquista.emoji || ''} ${conquista.nome}</span>
  `).join('') || '<span class="text-muted">Ainda sem conquistas recentes.</span>';
  document.getElementById('perfilStats').textContent = usuario.conquistas_recentes?.length
    ? 'Últimas conquistas exibidas acima.'
    : 'Não há conquistas recentes para mostrar.';
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
