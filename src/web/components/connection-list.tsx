import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { Connection } from '../../config/schema'
import { AccountDetail } from './account'

dayjs.extend(relativeTime)

export const ConnectionList = ({ connections }: { connections: Connection[] }) => {
  return (
    <div class="my-4 mx-8 space-y-2">
      {connections.map((connection) => (
        <div class="collapse collapse-arrow bg-base-200" key={connection.name}>
          <input type="checkbox" />
          <div class="collapse-title text-lg font-medium flex items-center gap-4">
            <span>{connection.name}</span>
          </div>
          <div class="collapse-content">
            <ConnectionDetails connection={connection} />

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

export const ConnectionDetails = ({ connection }: { connection: Connection }) => {
  const detailsId = `connection-details-${connection.name.replace(/[^a-zA-Z0-9]/g, '-')}`

  return (
    <div id={detailsId} class="grid grid-cols-2 gap-4 text-sm m-8 border border-primary p-4 rounded-lg bg-base-100">
      <div>
        <strong>Consent Status:</strong> {connection.consentStatus ?? 'Unknown'}
      </div>
      <div>
        <strong>Expires in:</strong> {connection.consentExpires ? dayjs(connection.consentExpires).fromNow() : 'Unknown'}
      </div>
      <div>
        <strong>Created:</strong> {connection.consentCreated ? dayjs(connection.consentCreated).format('DD MMM YYYY') : 'Unknown'}
      </div>
      <div class="flex items-center gap-2">
        <strong>Last refreshed:</strong> {connection.lastRefreshed ? dayjs(connection.lastRefreshed).fromNow() : 'Never'}
        <button
          title="Refresh connection status"
          hx-get={`/getMe/${connection.name}`}
          hx-target={`#${detailsId}`}
          hx-swap="outerHTML"
          class="btn btn-xs btn-ghost text-primary"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}