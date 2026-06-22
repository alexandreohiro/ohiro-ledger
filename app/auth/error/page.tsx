import { ShieldAlert } from 'lucide-react'
import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-xl bg-destructive/10 border border-destructive/30">
            <ShieldAlert className="size-7 text-destructive" />
          </div>
          <h1 className="font-mono text-xl font-bold tracking-widest text-foreground uppercase">
            Ohiro
          </h1>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4 text-center">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-widest text-destructive">
            Authentication Failed
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            An error occurred during authentication. The link may have expired or be invalid.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-md border border-border bg-transparent px-4 py-2 text-xs font-mono uppercase tracking-widest text-foreground hover:bg-muted/40 transition-colors"
          >
            Try again
          </Link>
        </div>
      </div>
    </div>
  )
}
