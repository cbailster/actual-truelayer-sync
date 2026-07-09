import type { Account} from '../../config/schema'
import { ActualAccountData } from '../actual-client'

export const AccountDetail = ({ account, actualAccount }: { account: Account, actualAccount: ActualAccountData | undefined }) => (
  <div class="collapse collapse-plus bg-base-200 border-base-300 border">
    <input type="checkbox" />
    <div class="collapse-title text-lg font-medium">{account.friendlyName}</div>
    <div class="collapse-content">
      <div class="space-y-1 pl-4">
        <p>
          <strong>Actual Budget:</strong> {actualAccount?.budgetName}
        </p>
        <p>
          <strong>Actual Account:</strong> {actualAccount?.name}
        </p>
        <p>
          <strong>TrueLayer ID:</strong> <code>{account.trueLayerId}</code>
        </p>
      </div>
    </div>
  </div>
)