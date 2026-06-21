import { ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/30">
            <ShieldCheck className="size-7 text-primary" />
          </div>
          <h1 className="font-mono text-xl font-bold tracking-widest text-foreground uppercase">
            Ohiro
          </h1>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 border border-primary/30 mx-auto">
            <ShieldCheck className="size-6 text-primary" />
          </div>
          <div>
            <h2 className="font-mono text-sm font-semibold uppercase tracking-widest text-foreground">
              Acesso Criado
            </h2>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Conta criada com sucesso. Verifique seu e-mail para confirmar o acesso antes de entrar no sistema.
            </p>
          </div>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-md border border-border bg-transparent px-4 py-2 text-xs font-mono uppercase tracking-widest text-foreground hover:bg-muted/40 transition-colors"
          >
            Ir para login
          </Link>
        </div>
      </div>
    </div>
  )
}
