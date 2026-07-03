import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import type { TrueLayerAccount, TrueLayerCard, TrueLayerTransactionRawType } from '../truelayer/types'
import { Account } from '../config/schema'
import { TrueLayerTransaction } from './transaction'

const baseConfigAccount: Account = {
  trueLayerId: 'tl-acc-1',
  actualId: 'actual-acc-1',
  budgetId: 'budget-1',
  friendlyName: 'My Account',
}

const baseTransactionRaw: TrueLayerTransactionRawType = {
  transaction_id: 'txn-1',
  timestamp: '2026-04-24T10:00:00Z',
  description: 'Coffee Shop',
  amount: 3.5,
  currency: 'GBP',
  transaction_type: 'DEBIT',
  transaction_category: 'PURCHASE',
  transaction_classification: [],
}

const baseTransaction: TrueLayerTransaction = new TrueLayerTransaction(baseTransactionRaw)

const trueLayerAccount: TrueLayerAccount = {
  account_id: 'tl-acc-1',
  account_type: 'TRANSACTION',
  currency: 'GBP',
  display_name: 'Current Account',
  update_timestamp: '2026-04-24T00:00:00Z',
  account_number: {},
  provider: { provider_id: 'first-direct' },
}

const trueLayerCreditCard: TrueLayerCard = {
  account_id: 'tl-card-1',
  card_network: 'VISA',
  card_type: 'CREDIT',
  currency: 'GBP',
  display_name: 'Credit Card',
  partial_card_number: '1234',
  name_on_card: 'Chris Sheppard',
  update_timestamp: '2026-04-24T00:00:00Z',
  provider: { provider_id: 'ms' },
}

const trueLayerDebitCard: TrueLayerCard = {
  ...trueLayerCreditCard,
  card_type: 'DEBIT',
}

describe('shouldFlipAmount', () => {
  const unflipped = 350
  const flipped = -350

  it('should not flip the amount for a regular account with no flip config', () => {
    baseTransaction.config = baseConfigAccount
    baseTransaction.trueLayerAccount = trueLayerAccount
    expect(baseTransaction.getAmountInPence()).toBe(unflipped)
  })

  it('should not flip the amount when trueLayerAccount is undefined', () => {
    baseTransaction.config = baseConfigAccount
    baseTransaction.trueLayerAccount = undefined
    expect(baseTransaction.getAmountInPence()).toBe(unflipped)
  })

  it('should flip the amount for a credit card with no explicit flip config', () => {
    baseTransaction.config = baseConfigAccount
    baseTransaction.trueLayerAccount = trueLayerCreditCard
    expect(baseTransaction.getAmountInPence()).toBe(flipped)
  })

  it('should not flip the amount for a debit card with no explicit flip config', () => {
    baseTransaction.config = baseConfigAccount
    baseTransaction.trueLayerAccount = trueLayerDebitCard
    expect(baseTransaction.getAmountInPence()).toBe(unflipped)
  })

  it('explicit flip: true overrides a non-credit card, amount should be flipped', () => {
    baseTransaction.config = { ...baseConfigAccount, flip: true }
    baseTransaction.trueLayerAccount = trueLayerDebitCard
    expect(baseTransaction.getAmountInPence()).toBe(flipped)
  })

  it('explicit flip: false overrides a credit card, amount should not be flipped', () => {
    baseTransaction.config = { ...baseConfigAccount, flip: false }
    baseTransaction.trueLayerAccount = trueLayerCreditCard
    expect(baseTransaction.getAmountInPence()).toBe(unflipped)
  })

  it('explicit flip: true with no trueLayerAccount should flip the amount', () => {
    baseTransaction.config = { ...baseConfigAccount, flip: true }
    baseTransaction.trueLayerAccount = undefined
    expect(baseTransaction.getAmountInPence()).toBe(flipped)
  })

  it('explicit flip: false with no trueLayerAccount should not flip the amount', () => {
    baseTransaction.config = { ...baseConfigAccount, flip: false }
    baseTransaction.trueLayerAccount = undefined
    expect(baseTransaction.getAmountInPence()).toBe(unflipped)
  })
})

describe('getAmountInPence', () => {
  beforeEach(() => {
    baseTransaction.config = undefined
    baseTransaction.trueLayerAccount = undefined
  })

  it('converts pounds to pence', () => {
    baseTransaction.config = undefined
    baseTransaction.trueLayerAccount = undefined
    expect(baseTransaction.getAmountInPence()).toBe(350)
  })

  it('flips amount when shouldFlip is true', () => {
    baseTransaction.config = { ...baseConfigAccount, flip: true }
    baseTransaction.trueLayerAccount = undefined
    expect(baseTransaction.getAmountInPence()).toBe(-350)
  })

  it('handles zero', () => {
    const zeroTransaction = new TrueLayerTransaction({ ...baseTransactionRaw, amount: 0 })
    expect(zeroTransaction.getAmountInPence()).toBe(0)
  })

  it('handles whole numbers', () => {
    const wholeTransaction = new TrueLayerTransaction({ ...baseTransactionRaw, amount: 100 })
    expect(wholeTransaction.getAmountInPence()).toBe(10000)
  })

  it('handles large amounts', () => {
    const largeTransaction = new TrueLayerTransaction({ ...baseTransactionRaw, amount: 1234.56 })
    expect(largeTransaction.getAmountInPence()).toBe(123456)
  })
})

describe('transformTransaction', () => {
  beforeAll(() => {
    baseTransaction.config = baseConfigAccount
    baseTransaction.trueLayerAccount = trueLayerAccount
  })

  it('maps fields correctly', () => {
    const result = baseTransaction.toActualTransaction()
    expect(result.account).toBe('actual-acc-1')
    expect(result.date).toBe('2026-04-24')
    expect(result.amount).toBe(350)
    expect(result.payee_name).toBe('Coffee Shop')
    expect(result.imported_id).toBe('txn-1')
    expect(result.cleared).toBe(true)
  })

  it('strips time from timestamp to get date', () => {
    const timeStampTransaction = new TrueLayerTransaction({ ...baseTransactionRaw, timestamp: '2026-01-15T23:59:59Z' })
    timeStampTransaction.config = baseConfigAccount
    timeStampTransaction.trueLayerAccount = trueLayerAccount
    const result = timeStampTransaction.toActualTransaction()
    expect(result.date).toBe('2026-01-15')
  })
    
  it('flips amount for a credit card', () => {
    baseTransaction.trueLayerAccount = trueLayerCreditCard
    const result = baseTransaction.toActualTransaction()
    expect(result.amount).toBe(-350)
  })

  it('does not flip amount for a regular account', () => {
    baseTransaction.trueLayerAccount = trueLayerAccount
    const result = baseTransaction.toActualTransaction()
    expect(result.amount).toBe(350)
  })

  it('explicit flip: false overrides credit card inference', () => {
    baseTransaction.config = { ...baseConfigAccount, flip: false }
    baseTransaction.trueLayerAccount = trueLayerCreditCard
    const result = baseTransaction.toActualTransaction()
    expect(result.amount).toBe(350)
  })
})

describe('cleanCategory', () => {
  it('returns undefined for UNKNOWN category', () => {
    const unknownCategoryTransaction = new TrueLayerTransaction({ ...baseTransactionRaw, transaction_category: 'UNKNOWN' })
    expect(unknownCategoryTransaction.cleanCategory()).toBeUndefined()
  })

  it('converts category to title case with spaces', () => {
    const categoryTransaction = new TrueLayerTransaction({ ...baseTransactionRaw, transaction_category: 'DIRECT_DEBIT' })
    expect(categoryTransaction.cleanCategory()).toBe('Direct Debit')
  })

  it('handles single word categories', () => {
    const singleWordTransaction = new TrueLayerTransaction({ ...baseTransactionRaw, transaction_category: 'CORRECTION' })
    expect(singleWordTransaction.cleanCategory()).toBe('Correction')
  })
})

describe('parseFieldDescription', () => {
    it('returns the description field when specified', () => {
        const transaction = new TrueLayerTransaction(baseTransactionRaw)
        transaction.config = { ...baseConfigAccount}
        expect(transaction['parseFieldDescription']('description')).toBe('Coffee Shop')
    })

    it('returns nested attribute values when specified', () => {
        const transaction = new TrueLayerTransaction({ ...baseTransactionRaw, meta: { provider_reference: 'ref-123' } })
        transaction.config = baseConfigAccount
        expect(transaction['parseFieldDescription']('meta.provider_reference')).toBe('ref-123')
        expect(transaction['parseFieldDescription']('meta.missing_field')).toBe('meta.missing_field')
    })

    it('returns unprocessed text when the field does not exist', () => {
        const transaction = new TrueLayerTransaction(baseTransactionRaw)
        transaction.config = baseConfigAccount
        expect(transaction['parseFieldDescription']('nonexistent_field')).toBe('nonexistent_field')
    })

    it('Interpolates fields into the provided string', () => {
        const transaction = new TrueLayerTransaction({ ...baseTransactionRaw, meta: { provider_reference: 'ref-123' } })
        transaction.config = baseConfigAccount
        const template = 'Payment for {{description}} with reference {{meta.provider_reference}} currency {{currency}}'
        const result = transaction['parseFieldDescription'](template)
        expect(result).toBe('Payment for Coffee Shop with reference ref-123 currency GBP')
    })

    it('Interpolates callable methods into the provided string', () => {
        const transaction = new TrueLayerTransaction(baseTransactionRaw)
        transaction.config = baseConfigAccount
        const template = 'Category: {{cleanCategory}}, Amount: {{getAmountInPence}}'
        const result = transaction['parseFieldDescription'](template)
        expect(result).toBe('Category: Purchase, Amount: 350')
    })
})