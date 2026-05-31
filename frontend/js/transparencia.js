protegerPagina(false);

function statusApostaLabel(status) {
  return { pendente: 'Pendente', aprovado: 'Aprovada', reprovado: 'Reprovada' }[status] || status || 'Pendente';
}

function escapeHtml(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function dinheiro(valor) {
  return `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`;
}

function formatarDataHoraJogo(valor) {
  if (!valor) return '-';
  const texto = String(valor);
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}, ${match[4]}:${match[5]}`;
  }
  return texto;
}

function resultadoJogo(jogo) {
  if (jogo.status !== 'finalizado') return '';
  return `<span class="badge">Resultado: ${jogo.placar_casa ?? '-'} x ${jogo.placar_fora ?? '-'}</span>`;
}

function classePalpite(palpite) {
  if (palpite.vencedor) return 'palpite-vencedor';
  if (palpite.perdedor) return 'palpite-perdedor';
  if (palpite.status_aposta === 'reprovado') return 'palpite-reprovado';
  if (palpite.meu) return 'minha-aposta';
  return '';
}

function situacaoPalpite(jogo, palpite) {
  if (palpite.vencedor) return '<span class="result-chip winner-chip">🏆 Ganhou</span>';
  if (palpite.perdedor) return '<span class="result-chip loser-chip">✕ Perdeu</span>';
  if (palpite.status_aposta === 'reprovado') return '<span class="result-chip rejected-chip">⚠ Reprovada</span>';
  if (jogo.status === 'finalizado' && Number(jogo.jogo_validado || 0) !== 1) return '<span class="result-chip pending-chip">⌛ Não validado</span>';
  return `<span class="status-badge ${palpite.status_aposta}">${statusApostaLabel(palpite.status_aposta)}</span>`;
}

function resumoJogo(jogo) {
  return `
    <div class="transparency-summary">
      <div><small>Palpites</small><strong>${jogo.total_palpites || 0}</strong></div>
      <div><small>Aprovadas</small><strong>${jogo.total_aprovadas || 0}</strong></div>
      <div><small>Vencedores</small><strong>${jogo.total_vencedores || 0}</strong></div>
      <div><small>Prêmio por vencedor</small><strong>${dinheiro(jogo.premio_por_vencedor)}</strong></div>
    </div>
  `;
}

function renderPalpites(jogo) {
  if (!jogo.palpites?.length) {
    return '<p class="text-muted">Nenhuma aposta registrada para este jogo.</p>';
  }

  return `
    <div class="table-wrap">
      <table class="transparency-table">
        <thead>
          <tr>
            <th>C&oacute;digo</th>
            <th>Participante</th>
            <th>Palpite</th>
            <th>Resultado</th>
            <th>Situa&ccedil;&atilde;o</th>
            <th>Ganho</th>
          </tr>
        </thead>
        <tbody>
          ${jogo.palpites.map((palpite) => `
            <tr class="${classePalpite(palpite)}">
              <td><strong class="bet-code">${palpite.vencedor ? '🏆 ' : ''}${escapeHtml(palpite.codigo_aposta)}</strong></td>
              <td>${escapeHtml(palpite.nome)}</td>
              <td>${palpite.palpite_casa} x ${palpite.palpite_fora}</td>
              <td>${jogo.status === 'finalizado' ? `${jogo.placar_casa ?? '-'} x ${jogo.placar_fora ?? '-'}` : '- x -'}</td>
              <td>${situacaoPalpite(jogo, palpite)}</td>
              <td>${palpite.vencedor ? `<strong class="prize-value">${dinheiro(palpite.premio)}</strong>` : '<span class="text-muted">-</span>'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function carregarTransparencia() {
  try {
    const data = await request('/transparencia');
    const jogos = data.jogos || [];
    document.getElementById('listaTransparencia').innerHTML = jogos.map((jogo) => `
      <article class="data-section transparency-card">
        <div class="section-title">
          <h2>${escapeHtml(jogo.time_casa)} x ${escapeHtml(jogo.time_fora)}</h2>
          <div class="actions">
            <span class="badge">${formatarDataHoraJogo(jogo.data_jogo)}</span>
            ${resultadoJogo(jogo)}
          </div>
        </div>
        ${resumoJogo(jogo)}
        ${renderPalpites(jogo)}
      </article>
    `).join('') || `
      <section class="card">
        <h2>Nenhum jogo dispon&iacute;vel</h2>
        <p class="text-muted">Nenhum jogo cadastrado para exibir na transpar&ecirc;ncia.</p>
      </section>
    `;
  } catch (err) {
    msg('mensagemTransparencia', err.message, 'error');
  }
}

carregarTransparencia();
setInterval(carregarTransparencia, 30000);
