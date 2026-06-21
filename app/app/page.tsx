import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTransactions, getInvestments, getDebts, getAiConsent } from '@/lib/actions'
import {
  getNotifications,
  getUserSettings,
  syncDebtNotifications,
} from '@/lib/notification-actions'
import { AppShell } from '@/components/ohiro/app-shell'

export default async function AppPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Sincroniza alertas de dívidas (idempotente — não duplica notificações)
  await syncDebtNotifications()

  const [transactions, investments, debts, notifications, settings, aiConsent] = await Promise.all([
    getTransactions(),
    getInvestments(),
    getDebts(),
    getNotifications(),
    getUserSettings(),
    getAiConsent(),
  ])

  return (
    <AppShell
      userEmail={user.email ?? ''}
      initialTransactions={transactions}
      initialInvestments={investments}
      initialDebts={debts}
      initialNotifications={notifications}
      initialNotificationDays={settings.notificationDaysBefore}
      initialAiConsent={aiConsent}
    />
  )
}
