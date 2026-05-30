const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASES = [26, 10, 26, 10, 26, 10];
const INDICE_INICIAL = (((((0 * 10 + 1) * 26 + 0) * 10 + 1) * 26 + 0) * 10 + 1);

function codigoApostaPorSequencia(sequencia) {
  let valor = INDICE_INICIAL + Math.max(1, Number(sequencia || 1)) - 1;
  const partes = Array(BASES.length);

  for (let i = BASES.length - 1; i >= 0; i -= 1) {
    const base = BASES[i];
    const resto = valor % base;
    partes[i] = i % 2 === 0 ? LETRAS[resto] : String(resto);
    valor = Math.floor(valor / base);
  }

  return partes.join('');
}

module.exports = { codigoApostaPorSequencia };
