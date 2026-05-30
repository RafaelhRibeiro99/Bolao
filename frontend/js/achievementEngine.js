import definitions from './achievementDefinitions.js';

export function calcularProgresso(conquistasUsuario) {
  // Retorna array de conquistas com progresso, desbloqueada, equipada, exibida
  return definitions.map(def => {
    const userAch = conquistasUsuario.find(c => c.conquista_id === def.id) || {};
    return {
      ...def,
      desbloqueada: !!userAch.desbloqueada_em,
      equipada: !!userAch.equipada,
      exibida: userAch.exibida !== false,
      progresso: userAch.progresso || 0,
      desbloqueada_em: userAch.desbloqueada_em || null
    };
  });
}

export function mostrarToastConquista(conquista) {
  // Cria popup animado premium
  const toast = document.createElement('div');
  toast.className = `toast-conquista ${conquista.grau.toLowerCase()}`;
  toast.innerHTML = `
    <div class="toast-icon">🏆</div>
    <div class="toast-content">
      <div class="toast-title">NOVA CONQUISTA</div>
      <div class="toast-nome">✨ ${conquista.nome}</div>
      <div class="toast-desc">${conquista.descricao}</div>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => { toast.classList.add('show'); }, 100);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(()=>toast.remove(), 800); }, 5000);
}
