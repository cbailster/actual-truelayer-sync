import type { Connection } from '../../config/schema'
import { AccountDetail } from './account'

export const ConnectionList = ({ connections }: { connections: Connection[] }) => {
  const safeId = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '-')

  return (
    <div class="my-4 mx-8 space-y-2">
      {connections.map((connection) => (
        <div class="collapse collapse-arrow bg-base-200" key={connection.name}>
          <input type="radio" name="connection-accordion" />
          <div class="collapse-title text-lg font-medium">{connection.name}</div>
          <div class="collapse-content">
            <div class="space-y-2 pt-2">
              <h3 class="text-md font-semibold mb-2">Accounts</h3>
              {connection.accounts.map((account) => (
                <AccountDetail account={account} key={account.trueLayerId} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}