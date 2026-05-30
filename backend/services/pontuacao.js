function calcularPontos(jogo, palpite) {
  const placarExato = jogo.placar_casa === palpite.palpite_casa && jogo.placar_fora === palpite.palpite_fora;
  if (placarExato) return 10;

  const resultadoJogo = Math.sign(jogo.placar_casa - jogo.placar_fora);
  const resultadoPalpite = Math.sign(palpite.palpite_casa - palpite.palpite_fora);
  if (resultadoJogo === resultadoPalpite) return 5;

  return 0;
}

module.exports = { calcularPontos };
