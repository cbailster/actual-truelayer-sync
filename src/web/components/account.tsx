import type { Account} from '../../config/schema'

export const AccountDetail = ({ account }: { account: Account }) => (
  <div class="collapse collapse-plus bg-base-200 border-base-300 border">
    <input type="checkbox" />
    <div class="collapse-title text-lg font-medium">{account.friendlyName}</div>
    <div class="collapse-content">
      <div class="space-y-1 pl-4">
        <p>
          <strong>Actual Budget ID:</strong> <code>{account.actualId}</code>
        </p>
        <p>
          <strong>TrueLayer ID:</strong> <code>{account.trueLayerId}</code>
        </p>
        {account.budgetId && (
          <p>
            <strong>Actual Budget File ID:</strong> <code>{account.budgetId}</code>
          </p>
        )}
      </div>
    </div>
  </div>
)