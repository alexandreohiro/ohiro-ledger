import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — Ohiro",
  description:
    "Como o Ohiro coleta, usa e protege seus dados financeiros pessoais, em conformidade com a LGPD.",
};

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Voltar */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors mb-10"
        >
          <ArrowLeft className="size-3.5" />
          Voltar ao início
        </Link>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center size-9 rounded-md bg-primary/10 border border-primary/20">
            <Shield className="size-4 text-primary" />
          </div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-foreground">
            Política de Privacidade
          </h1>
        </div>
        <p className="text-xs font-mono text-muted-foreground mb-10">
          Ohiro · Última atualização: junho de 2026
        </p>

        <div className="flex flex-col gap-8 text-sm font-mono leading-relaxed text-foreground/80">

          <Section title="1. Quem somos">
            <p>
              O Ohiro é um aplicativo de gestão financeira pessoal desenvolvido e operado por Alexandre Ohiro
              (&quot;nós&quot;, &quot;nosso&quot;). Encarregado de Dados (DPO):{" "}
              <a href="mailto:privacidade@ohiroledger.com" className="text-primary underline underline-offset-2">
                privacidade@ohiroledger.com
              </a>
              .
            </p>
          </Section>

          <Section title="2. Dados coletados">
            <ul className="list-disc list-inside space-y-1.5 text-foreground/70">
              <li>
                <strong className="text-foreground">Conta:</strong> endereço de e-mail e senha (armazenada em hash via Supabase Auth — nunca em texto claro).
              </li>
              <li>
                <strong className="text-foreground">Dados financeiros:</strong> transações, investimentos, dívidas e configurações de notificação que você cadastra voluntariamente.
              </li>
              <li>
                <strong className="text-foreground">Arquivos enviados à IA:</strong> documentos (extratos, comprovantes) que você opcionalmente envia ao assistente de IA para análise. Esses arquivos são transmitidos ao provedor de IA selecionado e <strong className="text-foreground">não são armazenados por nós</strong> após o processamento da resposta.
              </li>
              <li>
                <strong className="text-foreground">Logs técnicos:</strong> registros de acesso e erro para segurança e diagnóstico, retidos por até 30 dias.
              </li>
            </ul>
          </Section>

          <Section title="3. Finalidade e base legal">
            <table className="w-full text-xs border border-border/40 rounded-lg overflow-hidden">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Finalidade</th>
                  <th className="text-left px-3 py-2 font-semibold">Base legal (LGPD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <TableRow a="Autenticação e segurança da conta" b="Execução de contrato (Art. 7º, V)" />
                <TableRow a="Armazenamento de dados financeiros" b="Execução de contrato (Art. 7º, V)" />
                <TableRow a="Envio de alertas de vencimento" b="Legítimo interesse / consentimento (Art. 7º, IX / II)" />
                <TableRow a="Processamento por IA (Gemini/OpenAI/etc.)" b="Consentimento explícito e renovável (Art. 7º, I)" />
                <TableRow a="Diagnóstico e segurança (logs)" b="Legítimo interesse (Art. 7º, IX)" />
              </tbody>
            </table>
          </Section>

          <Section title="4. Transferência internacional de dados">
            <p>
              O recurso de <strong className="text-foreground">IA Financeira</strong> permite que você envie mensagens e arquivos a provedores de inteligência artificial terceirizados, que podem operar fora do Brasil:
            </p>
            <ul className="list-disc list-inside space-y-1 text-foreground/70 mt-2">
              <li>Google Gemini (Google LLC — EUA)</li>
              <li>OpenAI GPT (OpenAI LLC — EUA)</li>
              <li>Anthropic Claude (Anthropic, PBC — EUA)</li>
              <li>Groq / Meta Llama (Groq, Inc. — EUA)</li>
            </ul>
            <p className="mt-2">
              Essa transferência ocorre <strong className="text-foreground">somente mediante seu consentimento explícito</strong>, obtido na primeira vez que você ativa o recurso de IA. Você pode revogar o consentimento a qualquer momento nas Configurações.
              Os dados enviados são sujeitos às políticas de privacidade de cada provedor. Recomendamos <strong className="text-foreground">não incluir CPF, número de cartão ou senhas</strong> nas mensagens.
            </p>
          </Section>

          <Section title="5. Prazo de retenção">
            <ul className="list-disc list-inside space-y-1.5 text-foreground/70">
              <li>Dados financeiros: enquanto a conta estiver ativa.</li>
              <li>Após exclusão de conta: dados apagados ou anonimizados em até 30 dias.</li>
              <li>Logs técnicos: até 30 dias.</li>
              <li>Arquivos enviados à IA: não retidos — processados em tempo real e descartados.</li>
            </ul>
          </Section>

          <Section title="6. Seus direitos como titular (Art. 18 LGPD)">
            <ul className="list-disc list-inside space-y-1.5 text-foreground/70">
              <li>Confirmar a existência de tratamento dos seus dados.</li>
              <li>Acessar e exportar seus dados (disponível em Configurações → Exportar dados).</li>
              <li>Corrigir dados incompletos ou inexatos.</li>
              <li>Revogar o consentimento para uso de IA (Configurações → IA Financeira).</li>
              <li>Solicitar a exclusão de todos os dados e da conta (Configurações → Excluir conta).</li>
              <li>Portabilidade: exportação em JSON com todos os registros.</li>
            </ul>
            <p className="mt-2">
              Para exercer qualquer direito, entre em contato:{" "}
              <a href="mailto:privacidade@ohiroledger.com" className="text-primary underline underline-offset-2">
                privacidade@ohiroledger.com
              </a>
              . Responderemos em até 15 dias úteis.
            </p>
          </Section>

          <Section title="7. Segurança">
            <p>
              Adotamos Row Level Security (RLS) no banco de dados, autenticação via Supabase Auth com hash de senha,
              comunicação exclusivamente via HTTPS/TLS, e headers de segurança (CSP, HSTS, X-Frame-Options).
              Dados financeiros nunca são expostos a outros usuários.
            </p>
          </Section>

          <Section title="8. Contato e DPO">
            <p>
              Encarregado de Dados (DPO): Alexandre Ohiro.{" "}
              <a href="mailto:privacidade@ohiroledger.com" className="text-primary underline underline-offset-2">
                privacidade@ohiroledger.com
              </a>
              {" "}— use este endereço para exercer seus direitos de titular ou para qualquer dúvida sobre privacidade.
            </p>
          </Section>

        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-mono font-bold text-foreground tracking-widest uppercase border-b border-border/40 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function TableRow({ a, b }: { a: string; b: string }) {
  return (
    <tr>
      <td className="px-3 py-2 text-foreground/70">{a}</td>
      <td className="px-3 py-2 text-muted-foreground">{b}</td>
    </tr>
  );
}
