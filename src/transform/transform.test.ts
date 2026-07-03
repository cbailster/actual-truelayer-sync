import { describe, it, expect } from 'vitest'
import { transformTransactions } from './transform'
import type { TrueLayerAccount, TrueLayerTransactionRawType } from '../truelayer/types'
import { Account } from '../config/schema'

const baseAccount: Account = {
  trueLayerId: 'tl-acc-1',
  actualId: 'actual-acc-1',
  budgetId: 'budget-1',
  friendlyName: 'My Account',
}

const baseTransaction: TrueLayerTransactionRawType = {
  transaction_id: 'txn-1',
  timestamp: '2026-04-24T10:00:00Z',
  description: 'Coffee Shop',
  amount: 3.5,
  currency: 'GBP',
  transaction_type: 'DEBIT',
  transaction_category: 'PURCHASE',
  transaction_classification: [],
}

const trueLayerAccount: TrueLayerAccount = {
  account_id: 'tl-acc-1',
  account_type: 'TRANSACTION',
  currency: 'GBP',
  display_name: 'Current Account',
  update_timestamp: '2026-04-24T00:00:00Z',
  account_number: {},
  provider: { provider_id: 'first-direct' },
}

describe('transformTransactions', () => {
  it('maps an array of transactions', () => {
    const transactions = [
      baseTransaction,
      { ...baseTransaction, transaction_id: 'txn-2', amount: 10.0, description: 'Supermarket' },
    ]
    const result = transformTransactions(transactions, baseAccount, trueLayerAccount, false)
    expect(result).toHaveLength(2)
    expect(result[0].imported_id).toBe('txn-1')
    expect(result[1].imported_id).toBe('txn-2')
    expect(result[1].amount).toBe(1000)
  })

  it('returns an empty array for empty input', () => {
    expect(transformTransactions([], baseAccount, trueLayerAccount, false)).toEqual([])
  })

  it('passes includeCategoryInNotes to each transaction', () => {
    const result = transformTransactions([baseTransaction], baseAccount, trueLayerAccount, true)
    expect(result[0].notes).toBe('PURCHASE')
  })
})
