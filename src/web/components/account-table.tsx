import type { Account } from '../../config/schema'

type DisplayAccount = Account & {
  connectionName: string
}

export const AccountTable = ({ accounts }: { accounts: DisplayAccount[] }) => (
  <div class="my-4 mx-8 space-y-2">
    {accounts.map((account) => (
      <div class="collapse collapse-arrow bg-base-200" key={account.trueLayerId}>
        <input type="radio" name="account-accordion" />
        <div class="collapse-title text-lg font-medium">{account.friendlyName}</div>
        <div class="collapse-content">
          <div class="space-y-1">
            <p>
              <strong>Connection:</strong> {account.connectionName}
            </p>
            <p>
              <strong>Actual Budget ID:</strong> <code>{account.actualId}</code>
            </p>
          </div>
        </div>
      </div>
    ))}
  </div>
)