import { createClient } from '@/lib/supabase/server'
import { getTransactions, getInvestments, getDebts } from '@/lib/actions'

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ].join('\n')
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401 })
  }

  const format = new URL(req.url).searchParams.get('format') === 'csv' ? 'csv' : 'json'

  const [transactions, investments, debts] = await Promise.all([
    getTransactions(),
    getInvestments(),
    getDebts(),
  ])

  const timestamp = new Date().toISOString().slice(0, 10)

  if (format === 'csv') {
    const sections = [
      '## TRANSACOES',
      toCsv(transactions as unknown as Record<string, unknown>[]),
      '',
      '## INVESTIMENTOS',
      toCsv(investments as unknown as Record<string, unknown>[]),
      '',
      '## DIVIDAS',
      toCsv(debts as unknown as Record<string, unknown>[]),
    ].join('\n')

    return new Response(sections, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ohiro-export-${timestamp}.csv"`,
      },
    })
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    userId: user.id,
    transactions,
    investments,
    debts,
  }

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="ohiro-export-${timestamp}.json"`,
    },
  })
}
