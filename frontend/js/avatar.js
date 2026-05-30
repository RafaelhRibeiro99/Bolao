const AVATAR_ASSET_ROOT = '/static/avatar/faces';
const AVATAR_DEFAULT_FACE = 'messi.png';
let AVATAR_FACES = [AVATAR_DEFAULT_FACE];

function escapeAvatarText(text) {
  return String(text || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function avatarFaceFile(usuario = {}) {
  const value = usuario.avatar_face || usuario.avatar || AVATAR_FACES[0] || AVATAR_DEFAULT_FACE;
  const file = String(value).split('/').pop();
  return /^[^/\\]+\.png$/i.test(file) ? file : (AVATAR_FACES[0] || AVATAR_DEFAULT_FACE);
}

function avatarFaceSrc(file) {
  return `${AVATAR_ASSET_ROOT}/${encodeURIComponent(file)}`;
}

function avatarOnError() {
  return `if(!this.dataset.fallback){this.dataset.fallback='1';this.src='${avatarFaceSrc(AVATAR_FACES[0] || AVATAR_DEFAULT_FACE)}';}else{this.style.display='none';}`;
}

async function carregarAvatarFaces() {
  try {
    const data = await request('/avatar-faces');
    AVATAR_FACES = Array.isArray(data.faces) && data.faces.length ? data.faces : [data.padrao || AVATAR_DEFAULT_FACE];
  } catch {
    AVATAR_FACES = [AVATAR_DEFAULT_FACE];
  }
  return AVATAR_FACES;
}

function renderAvatarUsuario(usuario = {}, options = {}) {
  const size = options.size || 'md';
  const label = escapeAvatarText(usuario.nome_exibicao || usuario.nome || 'Usuário');
  const face = avatarFaceFile(usuario);

  return `
    <div class="avatar2d avatar2d-${size} avatar-face-card" role="img" aria-label="Avatar de ${label}">
      <img
        class="avatar-face-img"
        src="${avatarFaceSrc(face)}"
        alt=""
        aria-hidden="true"
        loading="lazy"
        onerror="${avatarOnError()}"
      >
    </div>
  `;
}

function preencherControlesAvatar(container, usuario = {}) {
  if (!container) return;
  const selected = avatarFaceFile(usuario);
  container.innerHTML = `
    <fieldset class="avatar-control-group avatar-face-control">
      <legend>Escolha seu avatar</legend>
      <div class="avatar-face-grid">
        ${AVATAR_FACES.map((file, index) => `
          <button class="avatar-face-option ${selected === file ? 'selected' : ''}" type="button" data-avatar-key="avatar_face" data-avatar-value="${file}" title="Avatar ${index + 1}">
            <img src="${avatarFaceSrc(file)}" alt="Avatar ${index + 1}" loading="lazy" onerror="this.closest('.avatar-face-option').hidden = true;">
          </button>
        `).join('')}
      </div>
      <input id="avatar_face" type="hidden" value="${AVATAR_FACES.includes(selected) ? selected : AVATAR_FACES[0]}" data-avatar-control>
    </fieldset>
  `;
}

function lerControlesAvatar() {
  const el = document.getElementById('avatar_face');
  return { avatar_face: el?.value || AVATAR_FACES[0] || AVATAR_DEFAULT_FACE };
}
