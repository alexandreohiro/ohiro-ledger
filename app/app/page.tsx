import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTransactions, getInvestments, getDebts, getBankAccounts, getAiConsent, getUserPreferences } from '@/lib/actions'
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

  const [transactions, investments, debts, accounts, notifications, settings, aiConsent, preferences] = await Promise.all([
    getTransactions(),
    getInvestments(),
    getDebts(),
    getBankAccounts(),
    getNotifications(),
    getUserSettings(),
    getAiConsent(),
    getUserPreferences(),
  ])

  return (
    <AppShell
      userEmail={user.email ?? ''}
      initialTransactions={transactions}
      initialInvestments={investments}
      initialDebts={debts}
      initialAccounts={accounts}
      initialNotifications={notifications}
      initialNotificationDays={settings.notificationDaysBefore}
      initialAiConsent={aiConsent}
      initialPreferences={preferences}
    />
  )
}
