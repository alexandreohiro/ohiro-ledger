// Sistema de Cálculo de Tempo de Serviço — Exército Brasileiro
// Base legal: Lei nº 6.880/1980 (Estatuto dos Militares), art. 137 — o tempo
// de efetivo serviço é computado "dia a dia" entre a data de ingresso e a data
// limite. A contagem é inclusiva (o dia da praça/incorporação é computado).
//
// Marcos de inatividade voluntária (reserva remunerada):
//   • 30 anos — regra histórica (anterior à Lei 13.954/2019)
//   • 35 anos — regra vigente após a Lei 13.954/2019
//
// Este módulo é puro (sem efeitos colaterais) e independente de fuso horário:
// todas as datas são tratadas em UTC a partir de strings "YYYY-MM-DD".

export interface PeriodoAdicional {
  id: string;
  descricao: string;
  dias: number; // positivo = acréscimo, negativo = desconto
}

export interface Duracao {
  anos: number;
  meses: number;
  dias: number;
  totalDias: number;
}

export interface MarcoTempo {
  anos: number;
  data: string; // YYYY-MM-DD em que o marco é completado
  atingido: boolean;
  faltamDias: number; // dias restantes até o marco (0 se já atingido)
}

export interface ResultadoTempoServico {
  bruto: Duracao; // tempo entre praça e referência (sem acréscimos)
  diasAdicionais: number; // soma dos períodos adicionais
  efetivo: Duracao; // tempo de efetivo serviço total
  marcos: MarcoTempo[];
  elegivelReserva35: boolean; // regra vigente (Lei 13.954/2019)
  elegivelReserva30: boolean; // regra histórica
}

const MS_POR_DIA = 86_400_000;

/** Converte "YYYY-MM-DD" em um timestamp UTC à meia-noite. */
function parseUTC(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Converte um timestamp UTC de volta para "YYYY-MM-DD". */
function formatUTC(ts: number): string {
  const dt = new Date(ts);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Diferença em dias inteiros entre dois timestamps UTC (fim − início). */
function diffDias(inicio: number, fim: number): number {
  return Math.round((fim - inicio) / MS_POR_DIA);
}

/**
 * Decompõe o intervalo [inicio, fimExclusivo) em anos/meses/dias de calendário.
 * fimExclusivo deve ser >= inicio.
 */
function decompor(inicio: number, fimExclusivo: number): { anos: number; meses: number; dias: number } {
  const s = new Date(inicio);
  const e = new Date(fimExclusivo);

  let anos = e.getUTCFullYear() - s.getUTCFullYear();
  let meses = e.getUTCMonth() - s.getUTCMonth();
  let dias = e.getUTCDate() - s.getUTCDate();

  if (dias < 0) {
    meses -= 1;
    // dias do mês imediatamente anterior ao mês de fimExclusivo
    const diasMesAnterior = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), 0)).getUTCDate();
    dias += diasMesAnterior;
  }
  if (meses < 0) {
    anos -= 1;
    meses += 12;
  }
  return { anos, meses, dias };
}

/** Soma n anos a um timestamp UTC, ajustando 29/02 → 28/02 quando necessário. */
function somarAnos(ts: number, n: number): number {
  const d = new Date(ts);
  const ano = d.getUTCFullYear() + n;
  const mes = d.getUTCMonth();
  let dia = d.getUTCDate();
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  if (dia > ultimoDia) dia = ultimoDia;
  return Date.UTC(ano, mes, dia);
}

/**
 * Calcula uma duração a partir de um total de dias inclusivos, usando a data de
 * praça como âncora de calendário para a decomposição em anos/meses/dias.
 */
function duracaoDeDias(pracaTs: number, totalDias: number): Duracao {
  const totalSeguro = Math.max(0, totalDias);
  // fim exclusivo = praça + totalDias (a contagem inclusiva já está embutida no total)
  const fimExclusivo = pracaTs + totalSeguro * MS_POR_DIA;
  const { anos, meses, dias } = decompor(pracaTs, fimExclusivo);
  return { anos, meses, dias, totalDias: totalSeguro };
}

/**
 * Calcula o tempo de serviço de um militar do Exército.
 *
 * @param dataPraca  data de praça/incorporação ("YYYY-MM-DD")
 * @param dataRef    data limite da contagem ("YYYY-MM-DD"), normalmente hoje
 * @param adicionais períodos de acréscimo/desconto em dias
 */
export function calcularTempoServico(
  dataPraca: string,
  dataRef: string,
  adicionais: PeriodoAdicional[] = []
): ResultadoTempoServico | null {
  if (!dataPraca || !dataRef) return null;
  const pracaTs = parseUTC(dataPraca);
  const refTs = parseUTC(dataRef);
  if (Number.isNaN(pracaTs) || Number.isNaN(refTs) || refTs < pracaTs) return null;

  // Contagem "dia a dia" inclusiva: + 1 dia para incluir o dia da praça.
  const diasBrutos = diffDias(pracaTs, refTs) + 1;
  const diasAdicionais = adicionais.reduce((acc, p) => acc + (Number(p.dias) || 0), 0);
  const diasEfetivos = diasBrutos + diasAdicionais;

  const bruto = duracaoDeDias(pracaTs, diasBrutos);
  const efetivo = duracaoDeDias(pracaTs, diasEfetivos);

  const marcosAnos = [10, 15, 20, 25, 30, 35];
  const marcos: MarcoTempo[] = marcosAnos.map((anos) => {
    // Marco atingido quando o tempo EFETIVO completa N anos. Estimamos a data do
    // marco a partir da praça, descontando os dias adicionais já creditados.
    const dataMarcoInclusiva = somarAnos(pracaTs, anos) - MS_POR_DIA; // anos completos (inclusivo)
    const dataMarcoTs = dataMarcoInclusiva - diasAdicionais * MS_POR_DIA;
    const atingido = efetivo.totalDias >= diffDias(pracaTs, somarAnos(pracaTs, anos));
    const faltamDias = atingido ? 0 : Math.max(0, diffDias(refTs, dataMarcoTs));
    return { anos, data: formatUTC(dataMarcoTs), atingido, faltamDias };
  });

  return {
    bruto,
    diasAdicionais,
    efetivo,
    marcos,
    elegivelReserva35: efetivo.anos >= 35,
    elegivelReserva30: efetivo.anos >= 30,
  };
}

/** Formata uma duração como "Xa Ym Zd". */
export function formatarDuracao(d: Duracao): string {
  return `${d.anos}a ${d.meses}m ${d.dias}d`;
}

/** Formata "YYYY-MM-DD" como "DD/MM/YYYY". */
export function formatarData(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
