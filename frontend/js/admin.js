protegerPagina(true);

const faseLabels = {
  fase_grupo: 'Fase de grupos',
  fase_grupos: 'Fase de grupos',
  '16_avos': '16 avos',
  oitavas: 'Oitavas',
  quartas: 'Quartas',
  semifinal: 'Semifinal',
  final: 'Final',
};

function escapeHtml(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function escapeJsString(valor) {
  return String(valor ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
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

function valorDatetimeLocal(valor) {
  if (!valor) return '';
  const texto = String(valor);
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
  if (!match) return '';
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`;
}

function arquivoPngParaDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (file.type !== 'image/png') return reject(new Error('Selecione um arquivo PNG.'));
    if (file.size > 2 * 1024 * 1024) return reject(new Error('O PNG do escudo deve ter no máximo 2 MB.'));

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo PNG.'));
    reader.readAsDataURL(file);
  });
}

let timesAdminCache = [];
let apostasAdminCache = [];
let jogosAdminCache = [];
let jogosApiCopaCache = [];
let jogosApiFonteAtual = '';
let jogoEmEdicaoId = null;
let jogoApostasModalId = null;
let relatoriosAdminCache = null;

function telaAdminAtual() {
  const tela = String(location.hash || '#usuarios').replace('#', '');
  return ['usuarios', 'apostas', 'times', 'jogos', 'relatorios', 'transparencia', 'area-usuario'].includes(tela)
    ? tela
    : 'usuarios';
}

function mostrarTelaAdmin(tela = telaAdminAtual()) {
  document.querySelectorAll('[data-admin-screen]').forEach((el) => {
    el.classList.toggle('hidden', el.dataset.adminScreen !== tela);
  });
  document.querySelectorAll('[data-admin-nav]').forEach((link) => {
    link.classList.toggle('active', link.dataset.adminNav === tela);
  });

  if (tela === 'transparencia') {
    carregarTransparenciaAdmin();
  }
  if (tela === 'relatorios') {
    carregarRelatoriosAdmin();
  }
}

function preencherSelecoesTimes() {
  const selects = [document.getElementById('timeCasa'), document.getElementById('timeFora')].filter(Boolean);
  const options = timesAdminCache
    .map((time) => `<option value="${escapeHtml(time.nome)}">${escapeHtml(time.nome)}</option>`)
    .join('');
  selects.forEach((select) => {
    select.innerHTML = options || '<option value="">Cadastre um time primeiro</option>';
  });
  const casa = document.getElementById('timeCasa');
  const fora = document.getElementById('timeFora');
  if (casa && timesAdminCache.some((time) => time.nome === 'Brasil')) casa.value = 'Brasil';
  if (fora && timesAdminCache.some((time) => time.nome === 'Argentina')) fora.value = 'Argentina';
}

function formatarFase(fase) {
  return faseLabels[fase] || fase || 'Fase de grupos';
}

function jogoLocalPorApi(jogoApi) {
  return jogosAdminCache.find((jogo) => (
    String(jogo.time_casa).toLowerCase() === String(jogoApi.time_casa).toLowerCase()
    && String(jogo.time_fora).toLowerCase() === String(jogoApi.time_fora).toLowerCase()
    && String(jogo.data_jogo).slice(0, 16) === String(jogoApi.data_jogo).slice(0, 16)
  ));
}

function filtrarJogosApi() {
  const termo = document.getElementById('buscaJogosApi')?.value.trim().toLowerCase() || '';
  if (!termo) return jogosApiCopaCache;
  return jogosApiCopaCache.filter((jogo) => [
    jogo.time_casa,
    jogo.time_fora,
    formatarFase(jogo.fase),
    jogo.rodada,
    formatarDataHoraJogo(jogo.data_jogo),
  ].some((valor) => String(valor || '').toLowerCase().includes(termo)));
}

function renderizarJogosApiCopa() {
  const destino = document.getElementById('jogosApiCopa');
  if (!destino) return;
  const jogos = filtrarJogosApi();
  destino.innerHTML = jogos.map((jogo, index) => {
    const local = jogoLocalPorApi(jogo);
    return `
      <article class="api-fixture-card ${local ? 'api-fixture-imported' : ''}">
        <div class="api-fixture-status">
          <span class="badge">${escapeHtml(formatarFase(jogo.fase))}</span>
          <span class="badge">${escapeHtml({ LIVE: 'Ao vivo', FT: 'Finalizado', NS: 'Aguardando' }[jogo.status] || jogo.status || 'Aguardando')}</span>
          <span class="status-badge ${local?.liberado_palpite ? 'pago' : 'pendente'}">${local ? (local.liberado_palpite ? 'Liberado' : 'Importado') : 'Na API'}</span>
        </div>
        <div class="api-fixture-teams">
          <div>${jogo.bandeira_casa ? `<img src="${escapeHtml(jogo.bandeira_casa)}" alt="${escapeHtml(jogo.time_casa)}">` : ''}<strong>${escapeHtml(jogo.time_casa)}</strong></div>
          <span>${jogo.gols_casa ?? '-'} x ${jogo.gols_fora ?? '-'}</span>
          <div>${jogo.bandeira_fora ? `<img src="${escapeHtml(jogo.bandeira_fora)}" alt="${escapeHtml(jogo.time_fora)}">` : ''}<strong>${escapeHtml(jogo.time_fora)}</strong></div>
        </div>
        <div class="api-fixture-meta">
          <span>${formatarDataHoraJogo(jogo.data_jogo)}</span>
          <span>${escapeHtml(jogo.rodada || 'Copa do Mundo')}</span>
          ${jogo.estadio ? `<span>${escapeHtml(jogo.estadio)}</span>` : ''}
        </div>
        <div class="actions">
          ${local
            ? `<button class="secondary" type="button" onclick="liberarJogo(${local.id}, true)">Liberar apostas</button>`
            : `<button class="primary" type="button" onclick="importarJogoApiCopa(${index})">Importar</button>`}
        </div>
      </article>
    `;
  }).join('') || '<p class="text-muted">Nenhum jogo encontrado. Clique em buscar ou ajuste o filtro.</p>';
}

async function carregarJogosApiCopa() {
  try {
    msg('apiCopaMsg', 'Buscando jogos da Copa 2026 na FIFA...', 'success');
    const data = await request('/admin/fifa2026/jogos');
    jogosApiCopaCache = data.jogos || [];
    jogosApiFonteAtual = `FIFA ${data.season || ''}`.trim();
    renderizarJogosApiCopa();
    msg('apiCopaMsg', `${jogosApiCopaCache.length} jogo(s) encontrados na ${jogosApiFonteAtual}.`);
  } catch (err) {
    msg('apiCopaMsg', err.message, 'error');
  }
}

async function importarJogoApiCopa(index) {
  const jogo = filtrarJogosApi()[index];
  if (!jogo) return;
  try {
    await request('/admin/fifa2026/jogos/importar', {
      method: 'POST',
      body: JSON.stringify(jogo),
    });
    msg('apiCopaMsg', 'Jogo importado. Agora você pode liberar as apostas quando quiser.');
    await carregarTimesAdmin();
    await carregarJogosAdmin();
    renderizarJogosApiCopa();
  } catch (err) {
    msg('apiCopaMsg', err.message, 'error');
  }
}

function formatarResultadoAdmin(j) {
  const placar = `${j.placar_casa ?? '-'} x ${j.placar_fora ?? '-'}`;
  const penaltis = j.penaltis_casa !== null && j.penaltis_casa !== undefined && j.penaltis_fora !== null && j.penaltis_fora !== undefined
    ? ` (${j.penaltis_casa} x ${j.penaltis_fora} pen.)`
    : '';
  return `${placar}${penaltis}`;
}

function jogoFifaAdmin(jogo) {
  return Boolean(jogo?.api_jogo_id);
}

function controlesResultadoAdmin(jogo) {
  if (jogoFifaAdmin(jogo)) {
    return `
      <div class="fifa-auto-result">
        <span class="badge">FIFA automático</span>
        <small>Placar e status atualizados pela API FIFA.</small>
      </div>
    `;
  }

  return `
    <form class="inline-form result-form" onsubmit="resultadoJogo(event, ${jogo.id})">
      <input type="number" min="0" name="casa" placeholder="Casa" required title="Placar casa">
      <input type="number" min="0" name="fora" placeholder="Fora" required title="Placar fora">
      <input type="number" min="0" name="penaltis_casa" placeholder="Pen. C" title="Pênaltis casa">
      <input type="number" min="0" name="penaltis_fora" placeholder="Pen. F" title="Pênaltis fora">
      <button class="primary">Resultado</button>
    </form>
  `;
}

function dinheiroAdmin(valor) {
  return `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`;
}

function nomeJogoAdmin(jogo) {
  return `${escapeHtml(jogo.time_casa)} x ${escapeHtml(jogo.time_fora)} - ${formatarDataHoraJogo(jogo.data_jogo)}`;
}

function statusApostaLabelAdmin(status) {
  return { pendente: 'Pendente', aprovado: 'Aprovada', reprovado: 'Reprovada' }[status] || status || 'Pendente';
}

function resultadoTransparenciaAdmin(jogo) {
  if (jogo.status !== 'finalizado') return '';
  return `<span class="badge">Resultado: ${jogo.placar_casa ?? '-'} x ${jogo.placar_fora ?? '-'}</span>`;
}

function situacaoTransparenciaAdmin(jogo, palpite) {
  if (palpite.vencedor) return '<span class="result-chip winner-chip">🏆 Ganhou</span>';
  if (palpite.perdedor) return '<span class="result-chip loser-chip">✕ Perdeu</span>';
  if (palpite.status_aposta === 'reprovado') return '<span class="result-chip rejected-chip">⚠ Reprovada</span>';
  if (jogo.status === 'finalizado' && Number(jogo.jogo_validado || 0) !== 1) return '<span class="result-chip pending-chip">⌛ Não validado</span>';
  return `<span class="status-badge ${palpite.status_aposta}">${statusApostaLabelAdmin(palpite.status_aposta)}</span>`;
}

function renderPalpitesTransparenciaAdmin(jogo) {
  if (!jogo.palpites?.length) {
    return '<p class="text-muted">Nenhuma aposta registrada para este jogo.</p>';
  }

  return `
    <div class="table-wrap">
      <table class="transparency-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Participante</th>
            <th>Palpite</th>
            <th>Resultado</th>
            <th>Situação</th>
            <th>Ganho</th>
          </tr>
        </thead>
        <tbody>
          ${jogo.palpites.map((palpite) => `
            <tr>
              <td><strong class="bet-code">${palpite.vencedor ? '🏆 ' : ''}${escapeHtml(palpite.codigo_aposta)}</strong></td>
              <td>${escapeHtml(palpite.nome)}</td>
              <td>${palpite.palpite_casa} x ${palpite.palpite_fora}</td>
              <td>${jogo.status === 'finalizado' ? `${jogo.placar_casa ?? '-'} x ${jogo.placar_fora ?? '-'}` : '- x -'}</td>
              <td>${situacaoTransparenciaAdmin(jogo, palpite)}</td>
              <td>${palpite.vencedor ? `<strong class="prize-value">${dinheiroAdmin(palpite.premio)}</strong>` : '<span class="text-muted">-</span>'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function carregarTransparenciaAdmin() {
  const destino = document.getElementById('transparenciaAdmin');
  if (!destino) return;

  try {
    const data = await request('/transparencia');
    const jogos = data.jogos || [];
    destino.innerHTML = jogos.map((jogo) => `
      <article class="data-section transparency-card">
        <div class="section-title">
          <h2>${escapeHtml(jogo.time_casa)} x ${escapeHtml(jogo.time_fora)}</h2>
          <div class="actions">
            <span class="badge">${formatarDataHoraJogo(jogo.data_jogo)}</span>
            ${resultadoTransparenciaAdmin(jogo)}
          </div>
        </div>
        <div class="transparency-summary">
          <div><small>Palpites</small><strong>${jogo.total_palpites || 0}</strong></div>
          <div><small>Aprovadas</small><strong>${jogo.total_aprovadas || 0}</strong></div>
          <div><small>Vencedores</small><strong>${jogo.total_vencedores || 0}</strong></div>
          <div><small>Prêmio por vencedor</small><strong>${dinheiroAdmin(jogo.premio_por_vencedor)}</strong></div>
        </div>
        ${renderPalpitesTransparenciaAdmin(jogo)}
      </article>
    `).join('') || '<section class="card"><h2>Nenhum jogo disponível</h2><p class="text-muted">Nenhum jogo cadastrado para exibir na transparência.</p></section>';
  } catch (err) {
    msg('transparenciaAdminMsg', err.message, 'error');
  }
}

function tabelaGanhadoresRelatorio(jogo) {
  if (!jogo.ganhadores?.length) {
    return `<article class="data-section"><h3>${nomeJogoAdmin(jogo)}</h3><p class="text-muted">Nenhum ganhador com placar exato.</p></article>`;
  }

  return `
    <article class="data-section">
      <div class="section-title"><h3>${nomeJogoAdmin(jogo)}</h3><span class="badge">${jogo.ganhadores.length} ganhador(es)</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>Pix</th><th>Jogo</th><th>Palpite</th><th>Resultado</th><th>Valor a receber</th></tr></thead>
          <tbody>
            ${jogo.ganhadores.map((palpite) => `
              <tr>
                <td>${escapeHtml(palpite.nome)}</td>
                <td>${palpite.pix_chave ? escapeHtml(palpite.pix_chave) : '<span class="text-muted">Não informado</span>'}</td>
                <td>${escapeHtml(jogo.time_casa)} x ${escapeHtml(jogo.time_fora)}</td>
                <td>${palpite.palpite_casa} x ${palpite.palpite_fora}</td>
                <td>${jogo.placar_casa ?? '-'} x ${jogo.placar_fora ?? '-'}</td>
                <td><strong>${dinheiroAdmin(palpite.valor_a_receber)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function tabelaApostasRelatorio(jogo) {
  return `
    <article class="data-section">
      <div class="section-title"><h3>${nomeJogoAdmin(jogo)}</h3><span class="badge">${jogo.apostas.length} aposta(s)</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Código</th><th>Nome</th><th>Pix</th><th>Palpite</th><th>Resultado</th><th>Status</th><th>Ganhou</th></tr></thead>
          <tbody>
            ${jogo.apostas.map((palpite) => `
              <tr>
                <td><strong class="bet-code">${escapeHtml(palpite.codigo_aposta || '-')}</strong></td>
                <td>${escapeHtml(palpite.nome)}</td>
                <td>${palpite.pix_chave ? escapeHtml(palpite.pix_chave) : '<span class="text-muted">Não informado</span>'}</td>
                <td>${palpite.palpite_casa} x ${palpite.palpite_fora}</td>
                <td>${jogo.status === 'finalizado' ? `${jogo.placar_casa ?? '-'} x ${jogo.placar_fora ?? '-'}` : '- x -'}</td>
                <td><span class="status-badge ${palpite.status_aposta}">${palpite.status_aposta}</span></td>
                <td>${palpite.vencedor ? `<strong>${dinheiroAdmin(palpite.valor_a_receber)}</strong>` : '<span class="text-muted">Não</span>'}</td>
              </tr>
            `).join('') || '<tr><td colspan="7">Nenhuma aposta neste jogo.</td></tr>'}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function tabelaFinanceiroRelatorio(data) {
  const total = data.total_geral || {};
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Jogo</th><th>Apostas</th><th>Aprovadas</th><th>Pendentes</th><th>Reprovadas</th>
            <th>Total arrecadado</th><th>Parte a pagar</th><th>Recebido plataforma</th>
          </tr>
        </thead>
        <tbody>
          ${(data.jogos || []).map((jogo) => `
            <tr>
              <td>${nomeJogoAdmin(jogo)}</td>
              <td>${jogo.financeiro.total_apostas}</td>
              <td>${jogo.financeiro.total_aprovadas}</td>
              <td>${jogo.financeiro.total_pendentes}</td>
              <td>${jogo.financeiro.total_reprovadas}</td>
              <td>${dinheiroAdmin(jogo.financeiro.arrecadado)}</td>
              <td><strong>${dinheiroAdmin(jogo.financeiro.valor_a_pagar)}</strong></td>
              <td>${dinheiroAdmin(jogo.financeiro.plataforma)}</td>
            </tr>
          `).join('')}
          <tr>
            <td><strong>Total geral</strong></td>
            <td><strong>${total.total_apostas || 0}</strong></td>
            <td><strong>${total.total_aprovadas || 0}</strong></td>
            <td><strong>${total.total_pendentes || 0}</strong></td>
            <td><strong>${total.total_reprovadas || 0}</strong></td>
            <td><strong>${dinheiroAdmin(total.arrecadado)}</strong></td>
            <td><strong>${dinheiroAdmin(total.valor_a_pagar)}</strong></td>
            <td><strong>${dinheiroAdmin(total.plataforma)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function resumoRelatorioHtml(data, tipo) {
  const jogos = data?.jogos || [];
  const total = data?.total_geral || {};
  const ganhadores = jogos.reduce((sum, jogo) => sum + (jogo.ganhadores?.length || 0), 0);
  const valorReceber = jogos.reduce((sum, jogo) => sum + (jogo.financeiro?.valor_a_pagar || 0), 0);
  const titulo = {
    ganhadores: 'Resumo dos ganhadores',
    apostas: 'Resumo das apostas',
    financeiro: 'Resumo financeiro',
  }[tipo] || 'Resumo';

  return `
    <section class="pdf-summary">
      <h2>${titulo}</h2>
      <div class="pdf-summary-grid">
        <div><small>Jogos</small><strong>${jogos.length}</strong></div>
        <div><small>Apostas</small><strong>${total.total_apostas || 0}</strong></div>
        <div><small>Aprovadas</small><strong>${total.total_aprovadas || 0}</strong></div>
        <div><small>Ganhadores</small><strong>${ganhadores}</strong></div>
        <div><small>Total arrecadado</small><strong>${dinheiroAdmin(total.arrecadado)}</strong></div>
        <div><small>Parte a pagar</small><strong>${dinheiroAdmin(valorReceber)}</strong></div>
        <div><small>Recebido plataforma</small><strong>${dinheiroAdmin(total.plataforma)}</strong></div>
      </div>
    </section>
  `;
}

function htmlPdfRelatorio(data, tipo) {
  const jogos = data?.jogos || [];
  const titulo = {
    ganhadores: 'Relatório de ganhadores por jogo',
    apostas: 'Relatório de todas as apostas por jogo',
    financeiro: 'Relatório financeiro',
  }[tipo] || 'Relatório';
  const conteudo = {
    ganhadores: jogos.map(tabelaGanhadoresRelatorio).join('') || '<p>Nenhum jogo cadastrado.</p>',
    apostas: jogos.map(tabelaApostasRelatorio).join('') || '<p>Nenhum jogo cadastrado.</p>',
    financeiro: tabelaFinanceiroRelatorio(data),
  }[tipo];

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${titulo}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 24px; }
        h1 { margin: 0 0 6px; font-size: 24px; }
        h2 { margin: 18px 0 10px; font-size: 18px; }
        h3 { margin: 0 0 8px; font-size: 15px; }
        .meta { color: #4b5563; margin-bottom: 18px; }
        .pdf-summary { border: 1px solid #d1d5db; padding: 12px; margin-bottom: 18px; }
        .pdf-summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .pdf-summary-grid div { border: 1px solid #e5e7eb; padding: 8px; }
        small { display: block; color: #6b7280; font-size: 11px; }
        strong { font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0 18px; font-size: 11px; }
        th, td { border: 1px solid #d1d5db; padding: 6px; text-align: left; vertical-align: top; }
        th { background: #f3f4f6; }
        article, .data-section { page-break-inside: avoid; margin-bottom: 16px; }
        .badge, .status-badge, .text-muted { color: #374151; }
        .table-wrap { overflow: visible; }
        @page { size: A4 landscape; margin: 12mm; }
      </style>
    </head>
    <body>
      <h1>${titulo}</h1>
      <div class="meta">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
      ${resumoRelatorioHtml(data, tipo)}
      ${conteudo}
      <script>window.addEventListener('load', () => { window.print(); });</script>
    </body>
    </html>
  `;
}

function totalGeralRelatorio(jogos) {
  return jogos.reduce((acc, jogo) => ({
    total_apostas: acc.total_apostas + Number(jogo.financeiro?.total_apostas || 0),
    total_aprovadas: acc.total_aprovadas + Number(jogo.financeiro?.total_aprovadas || 0),
    total_pendentes: acc.total_pendentes + Number(jogo.financeiro?.total_pendentes || 0),
    total_reprovadas: acc.total_reprovadas + Number(jogo.financeiro?.total_reprovadas || 0),
    arrecadado: acc.arrecadado + Number(jogo.financeiro?.arrecadado || 0),
    valor_a_pagar: acc.valor_a_pagar + Number(jogo.financeiro?.valor_a_pagar || 0),
    plataforma: acc.plataforma + Number(jogo.financeiro?.plataforma || 0),
  }), {
    total_apostas: 0,
    total_aprovadas: 0,
    total_pendentes: 0,
    total_reprovadas: 0,
    arrecadado: 0,
    valor_a_pagar: 0,
    plataforma: 0,
  });
}

function relatorioFiltradoAdmin(data = relatoriosAdminCache) {
  const jogoId = document.getElementById('filtroRelatorioJogo')?.value || '';
  const jogos = jogoId
    ? (data?.jogos || []).filter((jogo) => Number(jogo.id) === Number(jogoId))
    : (data?.jogos || []);
  return {
    ...data,
    jogos,
    total_geral: jogoId ? totalGeralRelatorio(jogos) : (data?.total_geral || totalGeralRelatorio(jogos)),
  };
}

function preencherFiltroRelatorioJogos(jogos) {
  const filtro = document.getElementById('filtroRelatorioJogo');
  if (!filtro) return;
  const selecionado = filtro.value;
  filtro.innerHTML = '<option value="">Todos os jogos</option>'
    + (jogos || []).map((jogo) => `<option value="${jogo.id}">${nomeJogoAdmin(jogo)}</option>`).join('');
  if ([...filtro.options].some((option) => option.value === selecionado)) {
    filtro.value = selecionado;
  }
}

function renderizarRelatoriosAdmin(data = relatorioFiltradoAdmin()) {
  const jogos = data.jogos || [];
  document.getElementById('relatorioGanhadores').innerHTML = jogos.map(tabelaGanhadoresRelatorio).join('') || '<p class="text-muted">Nenhum jogo encontrado para o filtro.</p>';
  document.getElementById('relatorioApostas').innerHTML = jogos.map(tabelaApostasRelatorio).join('') || '<p class="text-muted">Nenhum jogo encontrado para o filtro.</p>';
  document.getElementById('relatorioFinanceiro').innerHTML = tabelaFinanceiroRelatorio(data);
}

async function obterRelatoriosAdmin() {
  if (relatoriosAdminCache) return relatoriosAdminCache;
  relatoriosAdminCache = await request('/admin/relatorios');
  return relatoriosAdminCache;
}

async function gerarPdfRelatorio(tipo) {
  try {
    await obterRelatoriosAdmin();
    const data = relatorioFiltradoAdmin();
    const janela = window.open('', '_blank');
    if (!janela) {
      msg('relatoriosAdminMsg', 'Permita popups para gerar o PDF.', 'error');
      return;
    }
    janela.document.open();
    janela.document.write(htmlPdfRelatorio(data, tipo));
    janela.document.close();
  } catch (err) {
    msg('relatoriosAdminMsg', err.message, 'error');
  }
}

async function carregarRelatoriosAdmin() {
  try {
    const data = await request('/admin/relatorios');
    relatoriosAdminCache = data;
    preencherFiltroRelatorioJogos(data.jogos || []);
    renderizarRelatoriosAdmin(relatorioFiltradoAdmin(data));
  } catch (err) {
    msg('relatoriosAdminMsg', err.message, 'error');
  }
}

document.getElementById('filtroRelatorioJogo')?.addEventListener('change', () => {
  if (relatoriosAdminCache) renderizarRelatoriosAdmin(relatorioFiltradoAdmin());
});

function motivoReprovacaoHtml(aposta) {
  if (aposta.status_aposta !== 'reprovado' || !aposta.motivo_reprovacao) return '';
  return `<small class="text-muted">⚠️ ${escapeHtml(corrigirTextoMojibake(aposta.motivo_reprovacao))}</small>`;
}

async function carregarTimesAdmin() {
  try {
    const rows = await request('/admin/times');
    timesAdminCache = rows;
    preencherSelecoesTimes();
    const stat = document.getElementById('statTimes');
    if (stat) stat.textContent = `⚽ ${rows.length}`;
    const tbody = document.getElementById('timesAdmin');
    if (!tbody) return;
    tbody.innerHTML = rows.map((time) => `
      <tr>
        <td>${escapeHtml(time.nome)}</td>
        <td>${time.codigo ? escapeHtml(time.codigo) : '<span class="text-muted">Não informado</span>'}</td>
        <td>${time.escudo ? `<img src="${escapeHtml(time.escudo)}" alt="${escapeHtml(time.nome)}" class="team-admin-crest">` : '<span class="text-muted">Não informado</span>'}</td>
        <td>
          <input id="escudoUpload${time.id}" class="hidden" type="file" accept="image/png" onchange="trocarEscudoTime(${time.id}, this)">
          <button class="secondary" type="button" onclick="document.getElementById('escudoUpload${time.id}').click()">PNG</button>
          <button class="danger" onclick="excluirTime(${time.id})">Excluir</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="4">Nenhum time cadastrado.</td></tr>';
  } catch (err) {
    msg('msgAdmin', err.message, 'error');
  }
}

document.getElementById('formTime')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('nomeTime').value.trim();
  const codigo = document.getElementById('codigoTime').value.trim();
  const escudo_png = await arquivoPngParaDataUrl(document.getElementById('escudoTime').files[0]).catch((err) => {
    msg('msgAdmin', err.message, 'error');
    return undefined;
  });
  if (escudo_png === undefined) return;
  if (!nome) {
    msg('msgAdmin', 'Informe o nome do time.', 'error');
    return;
  }

  try {
    await request('/admin/times', { method: 'POST', body: JSON.stringify({ nome, codigo, escudo_png }) });
    msg('msgAdmin', 'Time cadastrado com sucesso.');
    e.target.reset();
    await carregarTimesAdmin();
  } catch (err) {
    msg('msgAdmin', err.message, 'error');
  }
});

async function trocarEscudoTime(id, input) {
  const escudo_png = await arquivoPngParaDataUrl(input.files[0]).catch((err) => {
    msg('msgAdmin', err.message, 'error');
    input.value = '';
    return undefined;
  });
  if (escudo_png === undefined) return;

  try {
    await request(`/admin/times/${id}`, { method: 'PUT', body: JSON.stringify({ escudo_png }) });
    msg('msgAdmin', 'Escudo atualizado com sucesso.');
    await carregarTimesAdmin();
  } catch (err) {
    msg('msgAdmin', err.message, 'error');
  } finally {
    input.value = '';
  }
}

async function carregarUsuarios() {
  try {
    const rows = await request('/admin/usuarios');
    document.getElementById('statUsuarios').textContent = `👥 ${rows.length}`;
    document.getElementById('usuarios').innerHTML = rows.map(u => `
      <tr>
        <td>${escapeHtml(u.nome)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${u.whatsapp ? escapeHtml(u.whatsapp) : '<span class="text-muted">Não informado</span>'}</td>
        <td>
          ${u.pix_chave ? `
            <span class="pix-value">${escapeHtml(u.pix_chave)}</span>
            <button class="secondary icon-action" type="button" title="Copiar chave Pix" onclick="copiarPix('${escapeJsString(u.pix_chave)}')">Copiar</button>
          ` : '<span class="text-muted">Não informado</span>'}
        </td>
        <td>${u.tipo === 'admin' ? 'Administrador' : 'Participante'}</td>
      </tr>`).join('');
  } catch (err) {
    msg('msgAdmin', err.message, 'error');
  }
}

async function copiarPix(chave) {
  try {
    await navigator.clipboard.writeText(chave);
    msg('msgAdmin', 'Chave Pix copiada.');
  } catch {
    msg('msgAdmin', 'Não foi possível copiar a chave Pix.', 'error');
  }
}

async function carregarApostasAdmin() {
  try {
    const rows = await request('/admin/apostas');
    apostasAdminCache = rows;
    document.getElementById('statPendentes').textContent = `⏳ ${rows.filter(a => a.status_aposta === 'pendente').length}`;
    document.getElementById('statAprovadas').textContent = `✅ ${rows.filter(a => a.status_aposta === 'aprovado').length}`;
    const jogosMap = new Map();
    rows.forEach((aposta) => {
      const jogoId = Number(aposta.jogo_id);
      if (!jogosMap.has(jogoId)) {
        jogosMap.set(jogoId, {
          id: jogoId,
          time_casa: aposta.time_casa,
          time_fora: aposta.time_fora,
          data_jogo: aposta.data_jogo,
          total: 0,
          pendentes: 0,
          aprovadas: 0,
          reprovadas: 0,
        });
      }
      const jogo = jogosMap.get(jogoId);
      jogo.total += 1;
      if (aposta.status_aposta === 'pendente') jogo.pendentes += 1;
      if (aposta.status_aposta === 'aprovado') jogo.aprovadas += 1;
      if (aposta.status_aposta === 'reprovado') jogo.reprovadas += 1;
    });

    document.getElementById('apostasAdmin').innerHTML = [...jogosMap.values()].map((jogo) => `
      <tr>
        <td>${escapeHtml(jogo.time_casa)} x ${escapeHtml(jogo.time_fora)}</td>
        <td>${formatarDataHoraJogo(jogo.data_jogo)}</td>
        <td>${jogo.total}</td>
        <td>${jogo.pendentes}</td>
        <td>${jogo.aprovadas}</td>
        <td>${jogo.reprovadas}</td>
        <td><button class="primary" onclick="abrirModalApostasJogo(${jogo.id})">Ver apostas</button></td>
      </tr>
    `).join('') || '<tr><td colspan="7">Nenhuma aposta registrada.</td></tr>';
  } catch (err) {
    msg('msgAdmin', err.message, 'error');
  }
}

function apostasDoJogoAtual() {
  const termo = document.getElementById('buscaApostasJogo')?.value.trim().toLowerCase() || '';
  return apostasAdminCache
    .filter((aposta) => Number(aposta.jogo_id) === Number(jogoApostasModalId))
    .filter((aposta) => !termo || String(aposta.nome || '').toLowerCase().includes(termo));
}

function renderizarModalApostasJogo() {
  const lista = document.getElementById('apostasJogoLista');
  if (!lista) return;

  const apostas = apostasDoJogoAtual();
  const todas = apostasAdminCache.filter((aposta) => Number(aposta.jogo_id) === Number(jogoApostasModalId));
  const jogo = todas[0];
  const resumo = document.getElementById('apostasJogoResumo');
  if (resumo) {
    resumo.innerHTML = `
      <div><small>Total</small><strong>${todas.length}</strong></div>
      <div><small>Pendentes</small><strong>${todas.filter((a) => a.status_aposta === 'pendente').length}</strong></div>
      <div><small>Aprovadas</small><strong>${todas.filter((a) => a.status_aposta === 'aprovado').length}</strong></div>
      <div><small>Reprovadas</small><strong>${todas.filter((a) => a.status_aposta === 'reprovado').length}</strong></div>
    `;
  }
  if (jogo) {
    document.getElementById('apostasJogoTitulo').textContent = `${jogo.time_casa} x ${jogo.time_fora}`;
  }

  lista.innerHTML = apostas.map((a) => `
    <tr>
      <td><strong class="bet-code">${escapeHtml(a.codigo_aposta || '-')}</strong></td>
      <td>${escapeHtml(a.nome)}<br><small>${escapeHtml(a.email)}</small></td>
      <td>${a.palpite_casa} x ${a.palpite_fora}</td>
      <td><span class="status-badge ${a.status_aposta}">${a.status_aposta}</span>${motivoReprovacaoHtml(a)}</td>
      <td>
        <button class="secondary" onclick="atualizarAposta(${a.id}, 'aprovado')">Aprovar</button>
        <button class="primary" onclick="atualizarAposta(${a.id}, 'pendente')">Pendente</button>
        <button class="danger" onclick="atualizarAposta(${a.id}, 'reprovado')">${a.status_aposta === 'reprovado' ? 'Alterar motivo' : 'Reprovar'}</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5">Nenhuma aposta encontrada.</td></tr>';
}

function abrirModalApostasJogo(jogoId) {
  jogoApostasModalId = Number(jogoId);
  const busca = document.getElementById('buscaApostasJogo');
  if (busca) busca.value = '';
  renderizarModalApostasJogo();
  document.getElementById('apostasJogoModal')?.classList.remove('hidden');
}

function fecharModalApostasJogo() {
  jogoApostasModalId = null;
  document.getElementById('apostasJogoModal')?.classList.add('hidden');
}

document.getElementById('buscaApostasJogo')?.addEventListener('input', renderizarModalApostasJogo);

async function atualizarAposta(id, status) {
  try {
    let motivo_reprovacao = null;
    if (status === 'reprovado') {
      const apostaAtual = apostasAdminCache.find((aposta) => Number(aposta.id) === Number(id));
      const motivoAtual = corrigirTextoMojibake(apostaAtual?.motivo_reprovacao || '');
      motivo_reprovacao = prompt('Informe o motivo da reprovação desta aposta:', motivoAtual);
      if (motivo_reprovacao === null) return;
      motivo_reprovacao = motivo_reprovacao.trim();
      if (!motivo_reprovacao) {
        msg('msgAdmin', 'Informe o motivo da reprovação.', 'error');
        return;
      }
    }

    await request(`/admin/apostas/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, motivo_reprovacao }),
    });
    await carregarApostasAdmin();
    await carregarUsuarios();
    if (jogoApostasModalId) renderizarModalApostasJogo();
    msg('msgAdmin', 'Status da aposta atualizado.');
  } catch (err) {
    msg('msgAdmin', err.message, 'error');
  }
}

document.getElementById('formJogo')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const time_casa = document.getElementById('timeCasa').value;
  const time_fora = document.getElementById('timeFora').value;
  const data_jogo = document.getElementById('dataJogo').value.replace('T', ' ') + ':00';
  const fase = document.getElementById('faseJogo').value;
  if (!time_casa || !time_fora) {
    msg('msgAdmin', 'Cadastre times antes de criar o jogo.', 'error');
    return;
  }
  if (time_casa === time_fora) {
    msg('msgAdmin', 'Selecione dois times diferentes.', 'error');
    return;
  }

  try {
    const url = jogoEmEdicaoId ? `/admin/jogos/${jogoEmEdicaoId}` : '/admin/jogos';
    const method = jogoEmEdicaoId ? 'PUT' : 'POST';
    await request(url, { method, body: JSON.stringify({ time_casa, time_fora, data_jogo, fase }) });
    msg('msgAdmin', jogoEmEdicaoId ? 'Jogo atualizado e liberado para apostas.' : 'Jogo criado com sucesso.');
    e.target.reset();
    sairEdicaoJogo();
    preencherSelecoesTimes();
    carregarJogosAdmin();
    carregarApostasAdmin();
  } catch (err) {
    msg('msgAdmin', err.message, 'error');
  }
});

async function carregarJogosAdmin() {
  try {
    const rows = await request('/admin/jogos');
    jogosAdminCache = rows;
    document.getElementById('statJogos').textContent = `⚽ ${rows.length}`;
    document.getElementById('jogosAdmin').innerHTML = rows.map(j => `
      <tr>
        <td>${escapeHtml(j.time_casa)} x ${escapeHtml(j.time_fora)}</td>
        <td>${formatarFase(j.fase)}</td>
        <td>${formatarDataHoraJogo(j.data_jogo)}</td>
        <td>${j.status}</td>
        <td><span class="status-badge ${j.liberado_palpite ? 'pago' : 'pendente'}">${j.liberado_palpite ? 'Sim' : 'Não'}</span></td>
        <td>${formatarResultadoAdmin(j)}</td>
        <td>
          <button class="secondary" onclick="editarJogo(${j.id})">Editar</button>
          <button class="secondary" onclick="liberarJogo(${j.id}, true)">Liberar</button>
          <button class="danger" onclick="liberarJogo(${j.id}, false)">Bloquear</button>
          ${controlesResultadoAdmin(j)}
          <button class="danger" onclick="excluirJogo(${j.id})">Excluir</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="6">Nenhum jogo cadastrado.</td></tr>';
    renderizarJogosApiCopa();
  } catch (err) {
    msg('msgAdmin', err.message, 'error');
  }
}

function sairEdicaoJogo() {
  jogoEmEdicaoId = null;
  const titulo = document.getElementById('formJogoTitulo');
  const btnSalvar = document.getElementById('btnSalvarJogo');
  const btnCancelar = document.getElementById('btnCancelarEdicaoJogo');
  if (titulo) titulo.innerHTML = '&#9917; Cadastrar jogo';
  if (btnSalvar) btnSalvar.textContent = 'Cadastrar';
  if (btnCancelar) btnCancelar.classList.add('hidden');
}

function editarJogo(id) {
  const jogo = jogosAdminCache.find((item) => Number(item.id) === Number(id));
  if (!jogo) {
    msg('msgAdmin', 'Jogo não encontrado para edição.', 'error');
    return;
  }

  jogoEmEdicaoId = Number(id);
  document.getElementById('timeCasa').value = jogo.time_casa;
  document.getElementById('timeFora').value = jogo.time_fora;
  document.getElementById('dataJogo').value = valorDatetimeLocal(jogo.data_jogo);
  document.getElementById('faseJogo').value = jogo.fase || 'fase_grupos';

  const titulo = document.getElementById('formJogoTitulo');
  const btnSalvar = document.getElementById('btnSalvarJogo');
  const btnCancelar = document.getElementById('btnCancelarEdicaoJogo');
  if (titulo) titulo.innerHTML = '&#9998; Editar jogo';
  if (btnSalvar) btnSalvar.textContent = 'Salvar edição';
  if (btnCancelar) btnCancelar.classList.remove('hidden');

  location.hash = '#jogos';
  document.getElementById('formJogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('btnCancelarEdicaoJogo')?.addEventListener('click', () => {
  document.getElementById('formJogo')?.reset();
  preencherSelecoesTimes();
  sairEdicaoJogo();
});

document.getElementById('buscaJogosApi')?.addEventListener('input', renderizarJogosApiCopa);

async function liberarJogo(id, liberado) {
  try {
    await request(`/admin/jogos/${id}/liberar`, { method: 'PUT', body: JSON.stringify({ liberado }) });
    msg('msgAdmin', liberado ? 'Jogo liberado.' : 'Jogo bloqueado.');
    carregarJogosAdmin();
  } catch (err) {
    msg('msgAdmin', err.message, 'error');
  }
}

async function resultadoJogo(e, id) {
  e.preventDefault();
  const placar_casa = Number(e.target.casa.value);
  const placar_fora = Number(e.target.fora.value);
  const penaltis_casa = e.target.penaltis_casa.value === '' ? null : Number(e.target.penaltis_casa.value);
  const penaltis_fora = e.target.penaltis_fora.value === '' ? null : Number(e.target.penaltis_fora.value);
  if ((penaltis_casa === null) !== (penaltis_fora === null)) {
    msg('msgAdmin', 'Informe os pênaltis dos dois times ou deixe ambos em branco.', 'error');
    return;
  }

  try {
    await request(`/admin/jogos/${id}/resultado`, { method: 'PUT', body: JSON.stringify({ placar_casa, placar_fora, penaltis_casa, penaltis_fora }) });
    try {
      const data = await request(`/admin/jogos/${id}/calcular`, { method: 'POST' });
      msg('msgAdmin', `Resultado salvo e ${data.message}`);
      await carregarApostasAdmin();
      await carregarJogosAdmin();
    } catch (calculoErr) {
      msg('msgAdmin', `Resultado salvo, mas ${calculoErr.message}`, 'warning');
      await carregarJogosAdmin();
    }
  } catch (err) {
    msg('msgAdmin', err.message, 'error');
  }
}

async function excluirJogo(id) {
  if (!confirm('Excluir este jogo? As apostas vinculadas a ele também serão removidas.')) return;

  try {
    await request(`/admin/jogos/${id}`, { method: 'DELETE' });
    msg('msgAdmin', 'Jogo excluido com sucesso.');
    carregarJogosAdmin();
    carregarApostasAdmin();
  } catch (err) {
    msg('msgAdmin', err.message, 'error');
  }
}

async function excluirTime(id) {
  if (!confirm('Excluir este time da lista de cadastro? Os jogos já criados não serão alterados.')) return;

  try {
    await request(`/admin/times/${id}`, { method: 'DELETE' });
    msg('msgAdmin', 'Time excluido com sucesso.');
    await carregarTimesAdmin();
  } catch (err) {
    msg('msgAdmin', err.message, 'error');
  }
}

carregarUsuarios();
carregarTimesAdmin();
carregarApostasAdmin();
carregarJogosAdmin();
mostrarTelaAdmin();

setInterval(() => {
  if (telaAdminAtual() === 'jogos') carregarJogosAdmin();
}, 15000);

window.addEventListener('hashchange', () => mostrarTelaAdmin());

window.carregarRelatoriosAdmin = carregarRelatoriosAdmin;
window.carregarJogosApiCopa = carregarJogosApiCopa;
window.importarJogoApiCopa = importarJogoApiCopa;
window.gerarPdfRelatorio = gerarPdfRelatorio;
window.copiarPix = copiarPix;
window.atualizarAposta = atualizarAposta;
window.abrirModalApostasJogo = abrirModalApostasJogo;
window.fecharModalApostasJogo = fecharModalApostasJogo;
window.liberarJogo = liberarJogo;
window.editarJogo = editarJogo;
window.resultadoJogo = resultadoJogo;
window.excluirJogo = excluirJogo;
window.excluirTime = excluirTime;
window.trocarEscudoTime = trocarEscudoTime;

