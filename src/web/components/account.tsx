import type { Account} from '../../config/schema'
import { ActualAccountData } from '../actual-client'

export const AccountDetail = ({
  connectionName,
  account,
  actualAccount,
}: {
  connectionName: string
  account: Account
  actualAccount: ActualAccountData | undefined
}) => {
  const accountDetailId = `account-detail-${account.trueLayerId}`
  return (
    <div id={accountDetailId} class="collapse collapse-plus bg-base-200 border-base-300 border">
      <input type="checkbox" />
      <div class="collapse-title text-lg font-medium">{account.friendlyName}</div>
      <div class="collapse-content">
        <div class="space-y-4 pl-4">
          <p>
            <strong>Actual Budget:</strong> {actualAccount?.budgetName}
          </p>
          <p>
            <strong>Actual Account:</strong> {actualAccount?.name}
          </p>
          <p>
            <strong>TrueLayer ID:</strong> <code>{account.trueLayerId}</code>
          </p>

          <form
            hx-post={`/account/${connectionName}/${account.trueLayerId}`}
            hx-target={`#${accountDetailId}`}
            hx-swap="outerHTML"
            class="form-control space-y-2"
          >
            <h4 class="font-semibold">Advanced Settings</h4>
            <div class="flex gap-2 items-center">
            <label class="input w-64 flex-auto">
              <span class="label">Description Field</span>
              <input type="text" name="descriptionField" value={account.descriptionField ?? ''} class="input input-bordered w-full" />
            </label>
            <label class="input w-64 flex-auto">
              <span class="label">Notes Field</span>
              <input type="text" name="notesField" value={account.notesField ?? ''} class="input input-bordered w-full" />
            </label>
            <label class="input w-64 flex-auto">
              <span class="label">Minimum Date</span>
              <input type="date" name="minDate" value={account.minDate ?? ''} class="input input-bordered w-full" />
            </label>
            </div>
            <button class="btn btn-primary self-start">Save</button>
          </form>
        </div>
      </div>
    </div>
  )
}