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

const SELECOES_COPA_2026 = [
  'África do Sul',
  'Alemanha',
  'Argélia',
  'Argentina',
  'Arsenal',
  'Arábia Saudita',
  'Austrália',
  'Áustria',
  'Bélgica',
  'Bósnia e Herzegovina',
  'Brasil',
  'Cabo Verde',
  'Canadá',
  'Colômbia',
  'Coreia do Sul',
  'Costa do Marfim',
  'Croácia',
  'Curazao',
  'Egito',
  'Equador',
  'Escócia',
  'Espanha',
  'Estados Unidos',
  'França',
  'Gana',
  'Haiti',
  'Inglaterra',
  'Irã',
  'Iraque',
  'Japão',
  'Jordânia',
  'Marrocos',
  'México',
  'Nigéria',
  'Noruega',
  'Nova Zelândia',
  'Países Baixos',
  'Panamá',
  'Paraguai',
  'PSG',
  'Portugal',
  'Qatar',
  'República Democrática do Congo',
  'República Tcheca',
  'Senegal',
  'Suécia',
  'Suíça',
  'Tunísia',
  'Turquia',
  'Uruguai',
  'Uzbequistão',
];

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

function preencherSelecoesCopa() {
  const selects = [document.getElementById('timeCasa'), document.getElementById('timeFora')].filter(Boolean);
  const options = SELECOES_COPA_2026
    .map((nome) => `<option value="${nome}">${nome}</option>`)
    .join('');
  selects.forEach((select) => {
    select.innerHTML = options;
  });
  const casa = document.getElementById('timeCasa');
  const fora = document.getElementById('timeFora');
  if (casa) casa.value = 'Brasil';
  if (fora) fora.value = 'Argentina';
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

let apostasAdminCache = [];

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
        && Number(a.pontos || 0) > 0;
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
  if (time_casa === time_fora) {
    msg('msgAdmin', 'Selecione dois times diferentes.', 'error');
    return;
  }

  try {
    await request('/admin/jogos', { method: 'POST', body: JSON.stringify({ time_casa, time_fora, data_jogo, fase }) });
    msg('msgAdmin', 'Jogo criado com sucesso.');
    e.target.reset();
    preencherSelecoesCopa();
    carregarJogosAdmin();
    carregarApostasAdmin();
  } catch (err) {
    msg('msgAdmin', err.message, 'error');
  }
});

async function carregarJogosAdmin() {
  try {
    const rows = await request('/admin/jogos');
    document.getElementById('statJogos').textContent = `⚽ ${rows.length}`;
    document.getElementById('jogosAdmin').innerHTML = rows.map(j => `
      <tr>
        <td>${escapeHtml(j.time_casa)} x ${escapeHtml(j.time_fora)}</td>
        <td>${formatarFase(j.fase)}</td>
        <td>${new Date(j.data_jogo).toLocaleString('pt-BR')}</td>
        <td>${j.status}</td>
        <td><span class="status-badge ${j.liberado_palpite ? 'pago' : 'pendente'}">${j.liberado_palpite ? 'Sim' : 'Não'}</span></td>
        <td>${formatarResultadoAdmin(j)}</td>
        <td>
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

carregarUsuarios();
preencherSelecoesCopa();
carregarApostasAdmin();
carregarJogosAdmin();
carregarConquistasAdmin();

window.seedConquistasAdmin = seedConquistasAdmin;
window.copiarPix = copiarPix;
window.atualizarAposta = atualizarAposta;
window.liberarJogo = liberarJogo;
window.resultadoJogo = resultadoJogo;
window.excluirJogo = excluirJogo;

