import type { TrueLayerTransactionRawType, TrueLayerAccount, TrueLayerCard } from '../truelayer/types'

import { Account } from '../config/schema'
import { TrueLayerTransaction, ActualTransaction } from '../truelayer/transaction'

export function transformTransactions(
  trueLayerTransactions: TrueLayerTransactionRawType[],
  configAccount: Account,
  trueLayerAccount: TrueLayerAccount | TrueLayerCard | undefined,
  includeCategoryInNotes: boolean,
): ActualTransaction[] {
  if (includeCategoryInNotes) {
    configAccount.notesField = 'transaction_category'
  }
  return trueLayerTransactions.map((t) => {
    const transaction = new TrueLayerTransaction(t)
    transaction.config = configAccount
    transaction.trueLayerAccount = trueLayerAccount
    return transaction.toActualTransaction()
  })
}
