'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('As senhas não coincidem')
      return
    }
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      router.push('/auth/sign-up-success')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm flex flex-col gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/30">
            <ShieldCheck className="size-7 text-primary" />
          </div>
          <div>
            <h1 className="font-mono text-xl font-bold tracking-widest text-foreground uppercase">
              Ohiro Ledger
            </h1>
            <p className="text-xs text-muted-foreground font-mono tracking-wider mt-1">
              SISTEMA FINANCEIRO TÁTICO
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-5">
          <div>
            <h2 className="font-mono text-sm font-semibold uppercase tracking-widest text-foreground">
              Novo Acesso
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Crie suas credenciais de acesso ao sistema
            </p>
          </div>

          <form onSubmit={handleSignUp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@exemplo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="font-mono text-sm bg-background/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-mono text-sm bg-background/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Confirmar Senha
              </Label>
              <Input
                id="confirm"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="font-mono text-sm bg-background/50"
              />
            </div>

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-mono text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full font-mono uppercase tracking-widest text-xs"
              disabled={isLoading}
            >
              {isLoading ? 'Criando acesso...' : 'Criar conta'}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Já tem acesso?{' '}
            <Link href="/auth/login" className="text-primary hover:underline font-mono">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
