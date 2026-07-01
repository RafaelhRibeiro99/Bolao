function calcularPontos(jogo, palpite) {
  const placarCasa = Number(jogo.placar_casa);
  const placarFora = Number(jogo.placar_fora);
  const palpiteCasa = Number(palpite.palpite_casa);
  const palpiteFora = Number(palpite.palpite_fora);

  const placarExato = placarCasa === palpiteCasa && placarFora === palpiteFora;
  if (placarExato) return 10;

  const resultadoJogo = Math.sign(placarCasa - placarFora);
  const resultadoPalpite = Math.sign(palpiteCasa - palpiteFora);
  if (resultadoJogo === resultadoPalpite) return 5;

  return 0;
}

module.exports = { calcularPontos };
