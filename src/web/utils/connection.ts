import fs from 'fs/promises'
import path from 'path'
import type { Connection, Account } from '../../config/schema'
import type { TrueLayerMe, TrueLayerAccount, TrueLayerCard } from '../../truelayer/types'

const DATA_DIR = path.resolve(__dirname, '..', '..', '..', 'data')

type ConnectionAccount = Connection['accounts'][number]

export function mapToConnection(
  me: TrueLayerMe,
  tlAccounts: (TrueLayerAccount | TrueLayerCard)[],
  accountMappings: Record<string, { actualId: string; budgetId: string }>,
  connectionName?: string,
): Connection {

  const accounts: Account[] = tlAccounts.map((tlAccount) => {
    const mapping = accountMappings[tlAccount.account_id]
    return trueLayerAccountToConnectionAccount(tlAccount, mapping)
  })

  return {
    name: connectionName? connectionName : me.provider.display_name,
    providerID: me.provider.provider_id,
    consentStatus: me.consent_status,
    consentCreated: me.consent_created_at,
    consentExpires: me.consent_expires_at,
    lastRefreshed: new Date().toISOString(),
    isCard: me.scopes.includes('cards'),
    accounts: accounts,
  }
}

function trueLayerAccountToConnectionAccount (
    tLAccount: TrueLayerAccount | TrueLayerCard,
    mapping?: { actualId: string; budgetId: string },
): ConnectionAccount {
    return {
        trueLayerId: tLAccount.account_id,
        actualId: mapping ? mapping.actualId : "",
        budgetId: mapping ? mapping.budgetId : "",
        friendlyName: tLAccount.display_name,
        isCard: 'card_type' in tLAccount,
    }
}