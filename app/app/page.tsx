import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTransactions, getInvestments, getDebts } from '@/lib/actions'
import { AppShell } from '@/components/ohiro/app-shell'

export default async function AppPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const [transactions, investments, debts] = await Promise.all([
    getTransactions(),
    getInvestments(),
    getDebts(),
  ])

  return (
    <AppShell
      userEmail={user.email ?? ''}
      initialTransactions={transactions}
      initialInvestments={investments}
      initialDebts={debts}
    />
  )
}
