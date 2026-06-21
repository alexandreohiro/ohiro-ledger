import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'Política de Privacidade — Ohiro',
  description: 'Como o Ohiro coleta, usa e protege seus dados pessoais, em conformidade com a LGPD.',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-svh w-full bg-background p-6">
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-8 py-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/30">
            <ShieldCheck className="size-7 text-primary" />
          </div>
          <div>
            <h1 className="font-mono text-xl font-bold tracking-widest text-foreground uppercase">
              Política de Privacidade
            </h1>
            <p className="text-xs text-muted-foreground font-mono tracking-wider mt-1">
              OHIRO
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-6 text-sm text-foreground/90 leading-relaxed">
          <p className="text-xs text-muted-foreground font-mono">
            Última atualização: 21 de junho de 2026
          </p>

          <section className="flex flex-col gap-2">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-foreground">
              1. Controlador dos dados
            </h2>
            <p>
              O Ohiro ("nós") é o controlador dos dados pessoais tratados nesta
              plataforma, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-foreground">
              2. Dados que coletamos
            </h2>
            <p>Coletamos os dados que você fornece diretamente ao usar o sistema:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>Dados de cadastro: e-mail e senha (a senha é armazenada de forma criptografada pelo provedor de autenticação).</li>
              <li>Dados financeiros que você insere: transações, dívidas, investimentos, descrições e valores.</li>
              <li>Conteúdo enviado ao assistente de IA (OHIRO-IA): mensagens de texto e, opcionalmente, arquivos (imagens, PDFs, planilhas) que você decide enviar para análise.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-foreground">
              3. Finalidade do tratamento
            </h2>
            <p>
              Usamos seus dados exclusivamente para operar o produto: autenticação, armazenamento
              e exibição do seu controle financeiro, geração de indicadores e respostas do
              assistente de IA. Não usamos seus dados financeiros para fins de publicidade.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-foreground">
              4. Compartilhamento com terceiros e transferência internacional
            </h2>
            <p>Para operar o serviço, utilizamos os seguintes operadores de dados:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>
                <strong>Supabase</strong> (infraestrutura de banco de dados e autenticação), responsável
                pelo armazenamento dos seus dados de cadastro e financeiros, protegidos por controle de
                acesso por usuário (Row Level Security).
              </li>
              <li>
                <strong>Google (Gemini API)</strong> — quando você usa o assistente de IA (OHIRO-IA), o
                conteúdo da sua mensagem e o contexto financeiro necessário para responder são enviados
                ao modelo Gemini, operado pelo Google, para gerar a resposta. Isso configura uma
                <strong> transferência internacional de dados</strong>, já que os servidores do Google
                podem processar essa informação fora do Brasil. Essa transferência ocorre apenas quando
                você efetivamente usa o assistente de IA, e apenas com o conteúdo necessário para a
                interação solicitada. O Google não recebe suas credenciais de acesso.
              </li>
            </ul>
            <p>Não vendemos nem compartilhamos seus dados com terceiros para fins de marketing.</p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-foreground">
              5. Seus direitos
            </h2>
            <p>Nos termos dos artigos 17 a 22 da LGPD, você pode solicitar, a qualquer momento:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>Confirmação da existência de tratamento e acesso aos seus dados.</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
              <li>Exportação dos seus dados em formato estruturado (disponível na área de Configurações do sistema).</li>
              <li>Exclusão dos seus dados e da sua conta.</li>
              <li>Revogação do consentimento, quando aplicável.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-foreground">
              6. Retenção e exclusão
            </h2>
            <p>
              Seus dados são mantidos enquanto sua conta estiver ativa. Ao excluir sua conta, seus
              dados financeiros, dívidas, investimentos e notificações são removidos permanentemente.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-foreground">
              7. Segurança
            </h2>
            <p>
              Aplicamos controle de acesso por usuário em nível de banco de dados (Row Level
              Security), de forma que cada usuário só pode acessar os seus próprios dados, mesmo em
              caso de falha na camada de aplicação.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-foreground">
              8. Contato
            </h2>
            <p>
              Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato
              pelo e-mail informado no rodapé do sistema.
            </p>
          </section>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/" className="text-primary hover:underline font-mono">
            Voltar
          </Link>
        </p>
      </div>
    </div>
  )
}
