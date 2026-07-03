import { Account } from '../config/schema'
import type { TrueLayerTransactionRawType, TrueLayerCurrency, TrueLayerTransactionCategory, TrueLayerCard, TrueLayerAccount } from './types'

export interface ActualTransaction {
  account: string
  date: string
  amount: number
  payee_name: string
  imported_id: string
  notes?: string
  cleared: boolean
}

export class TrueLayerTransaction {
  transaction_id: string
  normalised_provider_transaction_id?: string
  provider_transaction_id?: string
  timestamp: string
  description: string
  amount: number
  currency: TrueLayerCurrency
  transaction_type: 'DEBIT' | 'CREDIT'
  transaction_category: TrueLayerTransactionCategory
  transaction_classification: string[]
  merchant_name?: string
  running_balance?: {
    amount?: number
    currency?: TrueLayerCurrency
  }
  meta?: {
    provider_transaction_category?: string
    provider_reference?: string
    provider_merchant_name?: string
    provider_category?: string
    address?: string
    provider_id?: string
    counter_party_preferred_name?: string
    counter_party_iban?: string
    user_comments?: string
    debtor_account_name?: string
    provider_source?: string
  }
  config: Account | undefined
  trueLayerAccount: TrueLayerAccount | TrueLayerCard | undefined

  constructor(data: TrueLayerTransactionRawType) {
    this.transaction_id = data.transaction_id
    this.normalised_provider_transaction_id = data.normalised_provider_transaction_id
    this.provider_transaction_id = data.provider_transaction_id
    this.timestamp = data.timestamp
    this.description = data.description
    this.amount = data.amount
    this.currency = data.currency
    this.transaction_type = data.transaction_type
    this.transaction_category = data.transaction_category
    this.transaction_classification = data.transaction_classification
    this.merchant_name = data.merchant_name
    this.running_balance = data.running_balance
    this.meta = data.meta
  }

  public cleanCategory(): string | undefined {
    if (this.transaction_category === 'UNKNOWN') {
      return undefined
    }
    return this.transaction_category
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  private shouldFlipAmount(): boolean {
    // Determine flip: explicit config takes precedence, then infer from card_type === 'CREDIT'
    if (this.config && this.config.flip !== undefined) {
      return this.config.flip
    }
    if (this.trueLayerAccount !== undefined && 'card_type' in this.trueLayerAccount && this.trueLayerAccount.card_type === 'CREDIT') {
      return true
    }
    return false
  }

  public getAmountInPence(): number {
    const pence = Math.round(this.amount * 100)
    return pence === 0 ? 0 : pence * (this.shouldFlipAmount() ? -1 : 1)
  }

  public cleanDescription(): string {
    return this.description.replace(/,?\s*Transaction Date:\s*\d{4}-\d{2}-\d{2}/i, '').trim()
  }

  public toActualTransaction(): ActualTransaction {
    if (!this.config || !this.trueLayerAccount) {
      throw new Error('Config and TrueLayer account must be set before transforming to actual budget transaction')
    }
    return {
      account: this.config.actualId,
      date: this.timestamp.split('T')[0]!,
      amount: this.getAmountInPence(),
      payee_name: this.config.descriptionField ? this.parseFieldDescription(this.config.descriptionField) : this.cleanDescription(),
      imported_id: this.transaction_id,
      notes: this.config.notesField ? this.parseFieldDescription(this.config.notesField) : "",
      cleared: true,
    }
  }

  private attributeFromDefString(defString: string): string | undefined {
    const parts = defString.split('.')
    let current: any = this
    let parent: any = this
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        parent = current
        current = current[part]
      } else {
        return undefined
      }
    }

    if (typeof current === 'function') {
      current = current.call(parent)
    }

    return current !== undefined && current !== null ? String(current) : undefined
  }

  private hasAttribute(defString: string): boolean {
    return this.attributeFromDefString(defString) !== undefined
  }

  private parseFieldDescription(fieldDescription: string): string {
    // If the description is a bare attribute path, return the value of that attribute
    if (!fieldDescription.includes('{{') && this.hasAttribute(fieldDescription)) {
      const value = this.attributeFromDefString(fieldDescription)
      return value !== undefined ? value : fieldDescription
    }

    const templateRegex = /{{\s*([^}]+)\s*}}/g
    return fieldDescription.replaceAll(templateRegex, (match, attributePath) => {
      const trimmedPath = attributePath.trim()
      const attributeValue = this.attributeFromDefString(trimmedPath)
      return attributeValue ?? match
    })
  }
}