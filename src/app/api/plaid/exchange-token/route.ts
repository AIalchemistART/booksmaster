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
    const { public_token } = await request.json()

    if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
      return NextResponse.json(
        { error: 'Plaid API keys not configured' },
        { status: 500 }
      )
    }

    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    })

    const accessToken = exchangeResponse.data.access_token
    const itemId = exchangeResponse.data.item_id

    // Get account info
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    })

    const accounts = accountsResponse.data.accounts.map((account) => ({
      id: account.account_id,
      name: account.name,
      officialName: account.official_name,
      type: account.type,
      subtype: account.subtype,
      mask: account.mask,
      balance: account.balances.current,
    }))

    // Get institution info
    const itemResponse = await plaidClient.itemGet({
      access_token: accessToken,
    })

    let institutionName = 'Unknown Bank'
    if (itemResponse.data.item.institution_id) {
      try {
        const instResponse = await plaidClient.institutionsGetById({
          institution_id: itemResponse.data.item.institution_id,
          country_codes: ['US' as any],
        })
        institutionName = instResponse.data.institution.name
      } catch (e) {
        console.error('Failed to get institution name:', e)
      }
    }

    return NextResponse.json({
      success: true,
      itemId,
      institutionName,
      accounts,
      // In production, you'd store accessToken securely in a database
      // For this demo, we'll just return account info
    })
  } catch (error: any) {
    console.error('Plaid exchange error:', error.response?.data || error.message)
    return NextResponse.json(
      { error: error.response?.data?.error_message || 'Failed to exchange token' },
      { status: 500 }
    )
  }
}
