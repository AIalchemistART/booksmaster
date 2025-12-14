import { NextResponse } from 'next/server'
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
})

const plaidClient = new PlaidApi(configuration)

export async function POST(request: Request) {
  try {
    const { access_token, start_date, end_date } = await request.json()

    if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
      return NextResponse.json(
        { error: 'Plaid API keys not configured' },
        { status: 500 }
      )
    }

    const response = await plaidClient.transactionsGet({
      access_token,
      start_date: start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: end_date || new Date().toISOString().split('T')[0],
    })

    const transactions = response.data.transactions.map((t) => ({
      id: t.transaction_id,
      date: t.date,
      name: t.name,
      amount: t.amount,
      category: t.category?.[0] || 'Other',
      merchantName: t.merchant_name,
      pending: t.pending,
    }))

    return NextResponse.json({ transactions })
  } catch (error: any) {
    console.error('Plaid transactions error:', error.response?.data || error.message)
    return NextResponse.json(
      { error: error.response?.data?.error_message || 'Failed to get transactions' },
      { status: 500 }
    )
  }
}
