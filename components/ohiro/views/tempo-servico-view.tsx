"use client";

import { useMemo, useState } from "react";
import {
  calcularTempoServico,
  formatarDuracao,
  formatarData,
  type PeriodoAdicional,
} from "@/lib/tempo-servico";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Medal, CalendarClock, Plus, Trash2, ShieldCheck, Hourglass } from "lucide-react";

function hojeISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function TempoServicoView() {
  const [dataPraca, setDataPraca] = useState("");
  const [dataRef, setDataRef] = useState(hojeISO());
  const [adicionais, setAdicionais] = useState<PeriodoAdicional[]>([]);

  const resultado = useMemo(
    () => calcularTempoServico(dataPraca, dataRef, adicionais),
    [dataPraca, dataRef, adicionais]
  );

  function addPeriodo() {
    setAdicionais((prev) => [
      ...prev,
      { id: crypto.randomUUID(), descricao: "", dias: 0 },
    ]);
  }
  function updatePeriodo(id: string, patch: Partial<PeriodoAdicional>) {
    setAdicionais((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function removePeriodo(id: string) {
    setAdicionais((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase">
          Tempo de Serviço · Exército Brasileiro
        </div>
        <div className="text-[10px] font-mono text-muted-foreground/40 tracking-wider">
          Base legal: Lei 6.880/80, art. 137
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Entradas ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="rounded-lg border border-border/40 bg-card/60 p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-4 text-[hsl(var(--accent))]" />
              <span className="text-xs font-mono font-semibold text-foreground tracking-wide">
                Dados do Militar
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">
                Data de praça / incorporação
              </label>
              <Input
                className="h-8 text-xs font-mono"
                type="date"
                value={dataPraca}
                onChange={(e) => setDataPraca(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">
                Data de referência
              </label>
              <Input
                className="h-8 text-xs font-mono"
                type="date"
                value={dataRef}
                onChange={(e) => setDataRef(e.target.value)}
              />
            </div>
          </div>

          {/* Períodos adicionais */}
          <div className="rounded-lg border border-border/40 bg-card/60 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hourglass className="size-4 text-[hsl(var(--accent))]" />
                <span className="text-xs font-mono font-semibold text-foreground tracking-wide">
                  Acréscimos / Descontos
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[10px] font-mono"
                onClick={addPeriodo}
              >
                <Plus className="size-3 mr-1" /> Período
              </Button>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground/60 leading-relaxed">
              Informe em dias. Use valores negativos para abater períodos não
              computados (ex.: licença não contável).
            </p>
            {adicionais.length === 0 && (
              <div className="text-[10px] font-mono text-muted-foreground/40 italic">
                Nenhum período adicional informado.
              </div>
            )}
            {adicionais.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <Input
                  className="h-8 text-xs font-mono flex-1"
                  placeholder="Descrição"
                  value={p.descricao}
                  onChange={(e) => updatePeriodo(p.id, { descricao: e.target.value })}
                />
                <Input
                  className="h-8 text-xs font-mono w-20"
                  type="number"
                  value={p.dias}
                  onChange={(e) => updatePeriodo(p.id, { dias: Number(e.target.value) })}
                />
                <button
                  onClick={() => removePeriodo(p.id)}
                  className="text-muted-foreground/50 hover:text-destructive transition-colors"
                  aria-label="Remover período"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Resultados ───────────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {!resultado ? (
            <div className="rounded-lg border border-dashed border-border/40 bg-card/30 p-10 flex flex-col items-center justify-center gap-2 text-center">
              <Medal className="size-6 text-muted-foreground/30" />
              <div className="text-xs font-mono text-muted-foreground/60">
                Informe uma data de praça válida (anterior ou igual à referência)
                para calcular o tempo de serviço.
              </div>
            </div>
          ) : (
            <>
              {/* Cartões de duração */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-[hsl(var(--accent))/25] bg-card/60 p-4">
                  <div className="text-[11px] font-mono text-muted-foreground/60 tracking-widest uppercase mb-2">
                    Tempo de Efetivo Serviço
                  </div>
                  <div className="text-3xl font-mono font-bold text-[hsl(var(--accent))] mb-1">
                    {formatarDuracao(resultado.efetivo)}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    {resultado.efetivo.totalDias.toLocaleString("pt-BR")} dias computados
                  </div>
                </div>
                <div className="rounded-lg border border-border/40 bg-card/60 p-4">
                  <div className="text-[11px] font-mono text-muted-foreground/60 tracking-widest uppercase mb-2">
                    Tempo Bruto (sem ajustes)
                  </div>
                  <div className="text-3xl font-mono font-bold text-foreground mb-1">
                    {formatarDuracao(resultado.bruto)}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    Ajustes: {resultado.diasAdicionais >= 0 ? "+" : ""}
                    {resultado.diasAdicionais.toLocaleString("pt-BR")} dias
                  </div>
                </div>
              </div>

              {/* Elegibilidade reserva */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <EligibilidadeCard
                  titulo="Reserva (regra vigente)"
                  detalhe="35 anos — Lei 13.954/2019"
                  elegivel={resultado.elegivelReserva35}
                />
                <EligibilidadeCard
                  titulo="Reserva (regra histórica)"
                  detalhe="30 anos — anterior a 2019"
                  elegivel={resultado.elegivelReserva30}
                />
              </div>

              {/* Marcos */}
              <div className="rounded-lg border border-border/40 bg-card/60 p-4">
                <div className="text-[11px] font-mono text-muted-foreground/60 tracking-widest uppercase mb-3">
                  Marcos de Tempo de Serviço
                </div>
                <div className="flex flex-col divide-y divide-border/30">
                  {resultado.marcos.map((m) => (
                    <div key={m.anos} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex items-center justify-center size-8 rounded-md border font-mono text-xs font-bold",
                            m.atingido
                              ? "border-[hsl(var(--accent))/40] bg-[hsl(var(--accent))/10] text-[hsl(var(--accent))]"
                              : "border-border/40 text-muted-foreground"
                          )}
                        >
                          {m.anos}
                        </div>
                        <div className="text-xs font-mono text-foreground">
                          {m.anos} anos de serviço
                        </div>
                      </div>
                      <div className="text-right">
                        {m.atingido ? (
                          <span className="text-[11px] font-mono text-[hsl(var(--accent))] flex items-center gap-1 justify-end">
                            <ShieldCheck className="size-3" /> atingido em {formatarData(m.data)}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-muted-foreground">
                            previsto p/ {formatarData(m.data)} · faltam{" "}
                            {m.faltamDias.toLocaleString("pt-BR")} dias
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[10px] font-mono text-muted-foreground/40 leading-relaxed">
                Cálculo conforme o art. 137 da Lei 6.880/80 (contagem dia a dia,
                inclusiva do dia da praça). Os marcos de reserva são referenciais;
                situações específicas (tempos majorados, transição da Lei
                13.954/2019, idade-limite por posto/graduação) podem alterar o
                resultado. Não substitui o assentamento oficial.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EligibilidadeCard({
  titulo,
  detalhe,
  elegivel,
}: {
  titulo: string;
  detalhe: string;
  elegivel: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 bg-card/60",
        elegivel ? "border-[hsl(var(--accent))/30]" : "border-border/40"
      )}
    >
      <div className="text-[11px] font-mono text-muted-foreground/60 tracking-widest uppercase mb-2">
        {titulo}
      </div>
      <div
        className={cn(
          "text-lg font-mono font-bold mb-1",
          elegivel ? "text-[hsl(var(--accent))]" : "text-muted-foreground"
        )}
      >
        {elegivel ? "Elegível" : "Não elegível"}
      </div>
      <div className="text-[11px] font-mono text-muted-foreground">{detalhe}</div>
    </div>
  );
}
