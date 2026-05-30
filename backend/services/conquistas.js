const RARIDADES = ['comum', 'raro', 'epico', 'lendario', 'mitico'];

const CONQUISTAS_BASE = [
  { id: 1, nome: 'Apito Inicial', descricao: 'Deu o pontapé inicial na sua jornada realizando o primeiro palpite.', grau: 'comum', emoji: '', moldura: '', aura: '', efeito_nome: '', tipo: 'palpites', valor: 1 },
  { id: 2, nome: 'Torcedor de Arquibancada', descricao: 'Entrou no clima da Copa realizando 5 palpites.', grau: 'raro', emoji: '📣', moldura: '', aura: '', efeito_nome: '', tipo: 'palpites', valor: 5 },
  { id: 3, nome: 'Fanático da Copa', descricao: 'Viveu intensamente a competição alcançando 15 palpites.', grau: 'epico', emoji: '🏟️', moldura: 'moldura_arquibancada', aura: '', efeito_nome: '', tipo: 'palpites', valor: 15 },
  { id: 4, nome: 'Mestre dos Palpites', descricao: 'Provou sua dedicação realizando 30 palpites oficiais.', grau: 'lendario', emoji: '🎯', moldura: 'moldura_dourada', aura: 'aura_dourada', efeito_nome: '', tipo: 'palpites', valor: 30 },
  { id: 5, nome: 'Alma da Copa', descricao: 'Acompanhou cada momento da competição participando de todos os jogos oficiais.', grau: 'mitico', emoji: '🏆', moldura: 'moldura_copa', aura: 'aura_copa', efeito_nome: 'efeito_coracao_futebol', tipo: 'todos_jogos', valor: 1 },
  { id: 6, nome: 'Primeiro Grito de Gol', descricao: 'Sentiu o gosto da vitória ao acertar seu primeiro jogo.', grau: 'comum', emoji: '', moldura: '', aura: '', efeito_nome: '', tipo: 'acertos', valor: 1 },
  { id: 7, nome: 'Hat-Trick', descricao: 'Demonstrou precisão absoluta acertando 3 placares exatos.', grau: 'raro', emoji: '⚽', moldura: '', aura: '', efeito_nome: '', tipo: 'exatos', valor: 3 },
  { id: 8, nome: 'Artilheiro dos Placares', descricao: 'Mostrou habilidade e alcançou 5 palpites vencedores.', grau: 'epico', emoji: '🥅', moldura: 'moldura_artilheiro', aura: '', efeito_nome: '', tipo: 'acertos', valor: 5 },
  { id: 9, nome: 'Rei da Bola', descricao: 'Entrou para a história ao acertar 10 placares exatos.', grau: 'lendario', emoji: '👑', moldura: 'moldura_real', aura: 'aura_real', efeito_nome: '', tipo: 'exatos', valor: 10 },
  { id: 10, nome: 'Oráculo do Mundial', descricao: 'Previu resultados como ninguém acertando 20 jogos da Copa.', grau: 'mitico', emoji: '🔮', moldura: 'moldura_oraculo', aura: 'aura_mistica', efeito_nome: 'efeito_o_oraculo', tipo: 'acertos', valor: 20 },
  { id: 11, nome: 'Mão Quente', descricao: 'Viveu uma fase iluminada vencendo 3 jogos consecutivos.', grau: 'raro', emoji: '🔥', moldura: '', aura: '', efeito_nome: '', tipo: 'sequencia', valor: 3 },
  { id: 12, nome: 'Imparável', descricao: 'Provou sua consistência acertando 5 jogos seguidos.', grau: 'epico', emoji: '🚀', moldura: 'moldura_sequencia', aura: '', efeito_nome: '', tipo: 'sequencia', valor: 5 },
  { id: 13, nome: 'Profeta do Futebol', descricao: 'Entrou para a história acertando 15 palpites consecutivos.', grau: 'lendario', emoji: '🧠', moldura: 'moldura_profeta', aura: 'aura_profeta', efeito_nome: '', tipo: 'sequencia', valor: 15 },
  { id: 14, nome: 'Visão de Jogo', descricao: 'Manteve mais de 75% de aproveitamento após 30 palpites.', grau: 'mitico', emoji: '👁️', moldura: 'moldura_visao', aura: 'aura_estrategica', efeito_nome: 'efeito_de_olho', tipo: 'taxa_30', valor: 75 },
  { id: 15, nome: 'Rumo ao Hexa', descricao: 'Acertou uma vitória da Seleção Brasileira na Copa do Mundo.', grau: 'raro', emoji: '🇧🇷', moldura: '', aura: '', efeito_nome: '', tipo: 'brasil', valor: 1 },
  { id: 16, nome: 'Sangue Verde e Amarelo', descricao: 'Demonstrou confiança na Seleção acertando 3 jogos do Brasil.', grau: 'epico', emoji: '💚', moldura: 'moldura_brasil', aura: '', efeito_nome: '', tipo: 'brasil', valor: 3 },
  { id: 17, nome: 'Coração Canarinho', descricao: 'Mostrou que sempre acreditou na Seleção acertando 5 jogos do Brasil.', grau: 'lendario', emoji: '💛', moldura: 'moldura_canarinho', aura: 'aura_brasil', efeito_nome: '', tipo: 'brasil', valor: 5 },
  { id: 18, nome: 'Alma Canarinha', descricao: 'Acertou todos os jogos do Brasil e eternizou seu nome na torcida.', grau: 'mitico', emoji: '🟢', moldura: 'moldura_alma_canarinha', aura: 'aura_canarinha', efeito_nome: 'efeito_verde_amarelo', tipo: 'brasil_todos_acertos', valor: 1 },
  { id: 19, nome: '12º Jogador', descricao: 'Demonstrou apoio absoluto à Seleção participando de todos os jogos do Brasil.', grau: 'lendario', emoji: '🙌', moldura: 'moldura_torcida', aura: 'aura_torcida', efeito_nome: '', tipo: 'brasil_todos_participacao', valor: 1 },
  { id: 20, nome: 'Sobrevivente', descricao: 'Sobreviveu à pressão do mata-mata acertando um confronto eliminatório.', grau: 'raro', emoji: '🛡️', moldura: '', aura: '', efeito_nome: '', tipo: 'mata_mata', valor: 1 },
  { id: 21, nome: 'Estratégia de Campeão', descricao: 'Mostrou inteligência competitiva acertando 3 jogos do mata-mata.', grau: 'epico', emoji: '♟️', moldura: 'moldura_estrategia', aura: '', efeito_nome: '', tipo: 'mata_mata', valor: 3 },
  { id: 22, nome: 'Rei do Mata-Mata', descricao: 'Dominou os jogos decisivos acertando a semifinal da Copa.', grau: 'lendario', emoji: '⚔️', moldura: 'moldura_mata_mata', aura: 'aura_decisao', efeito_nome: '', tipo: 'semifinal', valor: 1 },
  { id: 23, nome: 'Campeão Mundial', descricao: 'Previu corretamente o grande campeão da Copa do Mundo.', grau: 'mitico', emoji: '🌍', moldura: 'moldura_campeao_mundial', aura: 'aura_mundial', efeito_nome: 'efeito_campeao_mundial', tipo: 'final', valor: 1 },
  { id: 24, nome: 'Gol nos Acréscimos', descricao: 'Teve coragem e participou nos 2 minutos finais antes do fechamento dos palpites.', grau: 'epico', emoji: '⏱️', moldura: 'moldura_acrescimos', aura: '', efeito_nome: '', tipo: 'acrescimos', valor: 1 },
];

function normalizarGrau(grau) {
  const valor = String(grau || 'comum')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return RARIDADES.includes(valor) ? valor : 'comum';
}

function aplicarRegrasRaridade(conquista) {
  const grau = normalizarGrau(conquista.grau);
  return {
    ...conquista,
    grau,
    raridade: grau,
    titulo: conquista.nome,
    emoji: ['raro', 'epico', 'lendario', 'mitico'].includes(grau) ? conquista.emoji || '' : '',
    moldura: ['epico', 'lendario', 'mitico'].includes(grau) ? conquista.moldura || '' : '',
    aura: ['lendario', 'mitico'].includes(grau) ? conquista.aura || '' : '',
    efeito_nome: grau === 'mitico' ? conquista.efeito_nome || '' : '',
  };
}

const CONQUISTAS = CONQUISTAS_BASE.map(aplicarRegrasRaridade);

const MATA_MATA = new Set(['16_avos', 'oitavas', 'quartas', 'semifinal', 'final']);

function isAcerto(palpite) {
  return Number(palpite.pontos || 0) > 0;
}

function isExato(palpite) {
  return isAcerto(palpite)
    && Number(palpite.palpite_casa) === Number(palpite.placar_casa)
    && Number(palpite.palpite_fora) === Number(palpite.placar_fora);
}

function jogoTemBrasil(item) {
  return `${item.time_casa || ''} ${item.time_fora || ''}`.toLowerCase().includes('brasil');
}

function jogoFinalizado(jogo) {
  return jogo.status === 'finalizado'
    && jogo.placar_casa !== null
    && jogo.placar_casa !== undefined
    && jogo.placar_fora !== null
    && jogo.placar_fora !== undefined;
}

function brasilPerdeu(jogo) {
  if (!jogoFinalizado(jogo) || !jogoTemBrasil(jogo)) return false;
  const casa = Number(jogo.placar_casa);
  const fora = Number(jogo.placar_fora);
  const brasilCasa = String(jogo.time_casa || '').toLowerCase().includes('brasil');
  const brasilFora = String(jogo.time_fora || '').toLowerCase().includes('brasil');
  if (brasilCasa) return casa < fora;
  if (brasilFora) return fora < casa;
  return false;
}

function melhorSequencia(palpites) {
  let atual = 0;
  let melhor = 0;
  for (const palpite of [...palpites].sort((a, b) => new Date(a.data_palpite) - new Date(b.data_palpite))) {
    if (isAcerto(palpite)) {
      atual += 1;
      melhor = Math.max(melhor, atual);
    } else {
      atual = 0;
    }
  }
  return melhor;
}

function palpiteNosAcrescimos(palpite) {
  const jogoMs = new Date(String(palpite.data_jogo || '').replace(' ', 'T')).getTime();
  const palpiteMs = new Date(palpite.data_palpite).getTime();
  if (!Number.isFinite(jogoMs) || !Number.isFinite(palpiteMs)) return false;
  const inicioJanela = jogoMs - (12 * 60 * 1000);
  const fimJanela = jogoMs - (10 * 60 * 1000);
  return palpiteMs >= inicioJanela && palpiteMs <= fimJanela;
}

function metricasConquistas(palpites, jogos = []) {
  const aprovados = palpites.filter((p) => p.status_aposta === 'aprovado');
  const acertos = aprovados.filter(isAcerto);
  const jogosIds = new Set(jogos.map((j) => Number(j.id)).filter(Boolean));
  const jogosBrasilFinalizados = jogos.filter((jogo) => jogoTemBrasil(jogo) && jogoFinalizado(jogo));
  const jogosBrasilIds = new Set(jogosBrasilFinalizados.map((j) => Number(j.id)).filter(Boolean));
  const palpitesPorJogo = new Set(palpites.map((p) => Number(p.jogo_id)).filter(Boolean));
  const acertosBrasilIds = new Set(acertos.filter(jogoTemBrasil).map((p) => Number(p.jogo_id)).filter(Boolean));
  const participacoesBrasilIds = new Set(palpites.filter(jogoTemBrasil).map((p) => Number(p.jogo_id)).filter(Boolean));
  const jogosMataMataBrasil = jogosBrasilFinalizados.filter((jogo) => MATA_MATA.has(jogo.fase));
  const brasilEliminadoNoMataMata = jogosMataMataBrasil.some(brasilPerdeu);
  const brasilJogouFinal = jogosMataMataBrasil.some((jogo) => jogo.fase === 'final');
  const campanhaBrasilConcluida = brasilEliminadoNoMataMata || brasilJogouFinal;
  const total = palpites.length;

  return {
    total,
    aprovadas: aprovados.length,
    acertos: acertos.length,
    exatos: aprovados.filter(isExato).length,
    sequencia: melhorSequencia(aprovados),
    brasil: acertos.filter(jogoTemBrasil).length,
    mata_mata: acertos.filter((p) => MATA_MATA.has(p.fase)).length,
    semifinal: acertos.filter((p) => p.fase === 'semifinal').length,
    final: acertos.filter((p) => p.fase === 'final').length,
    acrescimos: palpites.filter(palpiteNosAcrescimos).length,
    taxa: total ? (acertos.length / total) * 100 : 0,
    todos_jogos: jogosIds.size > 0 && [...jogosIds].every((id) => palpitesPorJogo.has(id)) ? 1 : 0,
    brasil_todos_acertos: campanhaBrasilConcluida && jogosBrasilIds.size > 0 && [...jogosBrasilIds].every((id) => acertosBrasilIds.has(id)) ? 1 : 0,
    brasil_todos_participacao: campanhaBrasilConcluida && jogosBrasilIds.size > 0 && [...jogosBrasilIds].every((id) => participacoesBrasilIds.has(id)) ? 1 : 0,
  };
}

function progressoPorTipo(metricas, conquista) {
  if (conquista.tipo === 'palpites') return metricas.total;
  if (conquista.tipo === 'acertos') return metricas.acertos;
  if (conquista.tipo === 'exatos') return metricas.exatos;
  if (conquista.tipo === 'sequencia') return metricas.sequencia;
  if (conquista.tipo === 'brasil') return metricas.brasil;
  if (conquista.tipo === 'mata_mata') return metricas.mata_mata;
  if (conquista.tipo === 'semifinal') return metricas.semifinal;
  if (conquista.tipo === 'final') return metricas.final;
  if (conquista.tipo === 'acrescimos') return metricas.acrescimos;
  if (conquista.tipo === 'todos_jogos') return metricas.todos_jogos;
  if (conquista.tipo === 'brasil_todos_acertos') return metricas.brasil_todos_acertos;
  if (conquista.tipo === 'brasil_todos_participacao') return metricas.brasil_todos_participacao;
  if (conquista.tipo === 'taxa_30') return Math.round(metricas.taxa);
  return 0;
}

function conquistaDesbloqueada(metricas, conquista) {
  if (conquista.tipo === 'taxa_30') return metricas.total >= 30 && metricas.taxa > conquista.valor;
  return progressoPorTipo(metricas, conquista) >= conquista.valor;
}

function avaliarConquistas(palpites, jogos = []) {
  const metricas = metricasConquistas(palpites, jogos);
  return CONQUISTAS.map((conquista) => ({
    ...conquista,
    meta: conquista.valor,
    progresso: progressoPorTipo(metricas, conquista),
    desbloqueada: conquistaDesbloqueada(metricas, conquista),
  }));
}

function validarRegrasRecompensa(conquista) {
  const c = aplicarRegrasRaridade(conquista);
  if (c.grau === 'comum') return !c.emoji && !c.moldura && !c.aura && !c.efeito_nome;
  if (c.grau === 'raro') return Boolean(c.emoji) && !c.moldura && !c.aura && !c.efeito_nome;
  if (c.grau === 'epico') return Boolean(c.emoji) && Boolean(c.moldura) && !c.aura && !c.efeito_nome;
  if (c.grau === 'lendario') return Boolean(c.emoji) && Boolean(c.moldura) && Boolean(c.aura) && !c.efeito_nome;
  if (c.grau === 'mitico') return Boolean(c.emoji) && Boolean(c.moldura) && Boolean(c.aura) && Boolean(c.efeito_nome);
  return false;
}

module.exports = {
  RARIDADES,
  CONQUISTAS,
  avaliarConquistas,
  metricasConquistas,
  progressoPorTipo,
  validarRegrasRecompensa,
};
