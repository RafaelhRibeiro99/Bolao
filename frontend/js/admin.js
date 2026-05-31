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
let jogoEmEdicaoId = null;

function telaAdminAtual() {
  const tela = String(location.hash || '#usuarios').replace('#', '');
  return ['usuarios', 'apostas', 'times', 'jogos', 'conquistas', 'transparencia', 'area-usuario'].includes(tela)
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

function formatarResultadoAdmin(j) {
  const placar = `${j.placar_casa ?? '-'} x ${j.placar_fora ?? '-'}`;
  const penaltis = j.penaltis_casa !== null && j.penaltis_casa !== undefined && j.penaltis_fora !== null && j.penaltis_fora !== undefined
    ? ` (${j.penaltis_casa} x ${j.penaltis_fora} pen.)`
    : '';
  return `${placar}${penaltis}`;
}

function grauLabel(grau) {
  return {
    comum: 'Comum',
    raro: 'Raro',
    epico: 'Épico',
    lendario: 'Lendário',
    mitico: 'Mítico',
  }[grau] || grau;
}

function dinheiroAdmin(valor) {
  return `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`;
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

function efeitoNomeLabel(valor) {
  return {
    efeito_coracao_futebol: 'Coração do futebol',
    efeito_o_oraculo: 'O Oráculo',
    efeito_de_olho: 'De Olho',
    efeito_verde_amarelo: 'Verde-Amarelo',
    efeito_campeao_mundial: 'Campeão Mundial',
    efeito_campeao: 'Coração do futebol',
    efeito_oraculo: 'O Oráculo',
    efeito_visao: 'De Olho',
  }[valor] || valor;
}

function recompensasConquista(c) {
  return [
    c.titulo ? `Título: ${escapeHtml(c.titulo)}` : '',
    c.emoji ? `Emoji: ${c.emoji}` : '',
    c.moldura ? `Moldura: ${escapeHtml(c.moldura)}` : '',
    c.aura ? `Aura: ${escapeHtml(c.aura)}` : '',
    c.efeito_nome ? `Efeito: ${escapeHtml(efeitoNomeLabel(c.efeito_nome))}` : '',
  ].filter(Boolean).join('<br>') || 'Sem recompensa visual';
}

function motivoReprovacaoHtml(aposta) {
  if (aposta.status_aposta !== 'reprovado' || !aposta.motivo_reprovacao) return '';
  return `<small class="text-muted">⚠️ ${escapeHtml(corrigirTextoMojibake(aposta.motivo_reprovacao))}</small>`;
}

async function carregarConquistasAdmin() {
  try {
    const rows = await request('/admin/conquistas');
    const stat = document.getElementById('statConquistas');
    if (stat) stat.textContent = `🏆 ${rows.length}`;
    const tbody = document.getElementById('conquistasAdmin');
    if (!tbody) return;
    tbody.innerHTML = rows.map(c => `
      <tr>
        <td><strong>${escapeHtml(c.nome)}</strong><br><small>${escapeHtml(c.descricao)}</small></td>
        <td><span class="badge achievement-${c.grau}">${grauLabel(c.grau)}</span></td>
        <td>${recompensasConquista(c)}</td>
        <td>${escapeHtml(c.tipo)}: ${escapeHtml(c.valor)}</td>
      </tr>
    `).join('');
  } catch (err) {
    msg('msgAdmin', err.message, 'error');
  }
}

async function seedConquistasAdmin() {
  try {
    const data = await request('/admin/conquistas/seed', { method: 'POST' });
    msg('msgAdmin', data.message);
    carregarConquistasAdmin();
  } catch (err) {
    msg('msgAdmin', err.message, 'error');
  }
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
    document.getElementById('apostasAdmin').innerHTML = rows.map(a => {
      const vencedor = a.status_jogo === 'finalizado'
        && Number(a.jogo_validado || 0) === 1
        && a.status_aposta === 'aprovado'
        && Number(a.pontos || 0) === 10;
      return `
      <tr>
        <td><strong class="bet-code">${vencedor ? '🏆 ' : ''}${escapeHtml(a.codigo_aposta || '-')}</strong></td>
        <td>${escapeHtml(a.nome)}<br><small>${escapeHtml(a.email)}</small></td>
        <td>${escapeHtml(a.time_casa)} x ${escapeHtml(a.time_fora)}</td>
        <td>${a.palpite_casa} x ${a.palpite_fora}</td>
        <td><span class="status-badge ${a.status_aposta}">${a.status_aposta}</span>${motivoReprovacaoHtml(a)}</td>
        <td>
          <button class="secondary" onclick="atualizarAposta(${a.id}, 'aprovado')">Aprovar</button>
          <button class="primary" onclick="atualizarAposta(${a.id}, 'pendente')">Pendente</button>
          <button class="danger" onclick="atualizarAposta(${a.id}, 'reprovado')">${a.status_aposta === 'reprovado' ? 'Alterar motivo' : 'Reprovar'}</button>
        </td>
      </tr>
    `;
    }).join('') || '<tr><td colspan="6">Nenhuma aposta registrada.</td></tr>';
  } catch (err) {
    msg('msgAdmin', err.message, 'error');
  }
}

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
          <form class="inline-form result-form" onsubmit="resultadoJogo(event, ${j.id})">
            <input type="number" min="0" name="casa" placeholder="Casa" required title="Placar casa">
            <input type="number" min="0" name="fora" placeholder="Fora" required title="Placar fora">
            <input type="number" min="0" name="penaltis_casa" placeholder="Pen. C" title="Pênaltis casa">
            <input type="number" min="0" name="penaltis_fora" placeholder="Pen. F" title="Pênaltis fora">
            <button class="primary">Resultado</button>
          </form>
          <button class="danger" onclick="excluirJogo(${j.id})">Excluir</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="6">Nenhum jogo cadastrado.</td></tr>';
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
      await carregarConquistasAdmin();
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
carregarConquistasAdmin();
mostrarTelaAdmin();

window.addEventListener('hashchange', () => mostrarTelaAdmin());

window.seedConquistasAdmin = seedConquistasAdmin;
window.copiarPix = copiarPix;
window.atualizarAposta = atualizarAposta;
window.liberarJogo = liberarJogo;
window.editarJogo = editarJogo;
window.resultadoJogo = resultadoJogo;
window.excluirJogo = excluirJogo;
window.excluirTime = excluirTime;
window.trocarEscudoTime = trocarEscudoTime;

