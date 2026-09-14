import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { Connection } from '../../config/schema'
import { AccountDetail } from './account'
import { ActualClient } from '../actual-client'

dayjs.extend(relativeTime)

const connectionSortScript = `
  (() => {
    const select = document.getElementById('connection-sort')
    const list = document.getElementById('connection-list')

    if (!select || !list) return

    select.addEventListener('change', () => {
      const connections = Array.from(list.children)
      const sort = select.value

      connections.sort((a, b) => {
        if (sort === 'name') {
          return a.dataset.connectionName.localeCompare(b.dataset.connectionName)
        }

        if (sort === 'expiry') {
          const expiryA = a.dataset.connectionExpiry ? Number(a.dataset.connectionExpiry) : Number.POSITIVE_INFINITY
          const expiryB = b.dataset.connectionExpiry ? Number(b.dataset.connectionExpiry) : Number.POSITIVE_INFINITY
          return expiryA - expiryB
        }

        return Number(a.dataset.connectionIndex) - Number(b.dataset.connectionIndex)
      })

      list.replaceChildren(...connections)
    })
  })()
`

export const ConnectionList = ({ connections, actualClient, callbackUri, clientId }: { connections: Connection[], actualClient: ActualClient, callbackUri: string, clientId: string }) => {
  return (
    <div class="my-4 mx-8">
      <div class="flex items-center justify-end gap-2 mb-4">
        <label for="connection-sort" class="text-sm font-medium">Sort connections</label>
        <select id="connection-sort" class="select select-sm select-bordered" aria-label="Sort connections">
          <option value="original">Original order</option>
          <option value="name">Connection name</option>
          <option value="expiry">Days until expiry</option>
        </select>
      </div>
      <div id="connection-list" class="space-y-2">
        {connections.map((connection, index) => (
          <div
            class="collapse collapse-arrow bg-base-200"
            data-connection-name={connection.name}
            data-connection-expiry={connection.consentExpires ? dayjs(connection.consentExpires).valueOf() : ''}
            data-connection-index={index}
            key={connection.name}
          >
          <input type="checkbox" />
          <div class="collapse-title text-lg font-medium flex items-center gap-4">
            { connection.providerID && (
              <img src={`/logo/${connection.name}`} alt={`${connection.name} logo`} class="w-8 h-8 rounded-full" />
            )}
            <span>{connection.name}</span>
            <progress
              className={`progress w-56 float-right ml-auto ${
                connection.consentExpires && dayjs(connection.consentExpires).diff(dayjs(), 'day') > 30
                  ? 'progress-success'
                  : connection.consentExpires && dayjs(connection.consentExpires).diff(dayjs(), 'day') > 14
                    ? 'progress-warning'
                    : 'progress-error'
              }`}
              value={connection.consentExpires ? dayjs(connection.consentExpires).diff(dayjs(), 'day') : 0}
              max="90"
            ></progress>
          </div>
          <div class="collapse-content">
            <div class="flex items-center gap-2 mb-4">
              <a
                href={`https://auth.truelayer.com/?response_type=code&client_id=${clientId}&state=${connection.name}&scope=${connection.isCard ? 'cards' : 'accounts'}%20balance%20transactions%20offline_access&redirect_uri=${encodeURIComponent(callbackUri)}&providers=uk-ob-all%20uk-oauth-all`}
                class="btn btn-sm btn-success ml-auto float-right"
              >
                Reauthenticate
              </a>
            </div>
            <ConnectionDetails connection={connection} />

            <div class="space-y-2 pt-2">
              <h3 class="text-md font-semibold mb-2">Accounts</h3>
              {connection.accounts.map((account) => (
                <AccountDetail
                  connectionName={connection.name}
                  account={account}
                  actualAccount={actualClient.accountWithID(account.actualId)}
                  key={account.trueLayerId}
                />
              ))}
            </div>
          </div>
          </div>
        ))}
      </div>
      <script dangerouslySetInnerHTML={{ __html: connectionSortScript }} />
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
      <div class="flex items-center gap-1">
        <strong>Expires in:</strong>
        {connection.consentExpires ? (
          <span class="tooltip" data-tip={dayjs(connection.consentExpires).format('DD MMM YYYY')}>
            {dayjs(connection.consentExpires).fromNow()}
          </span>
        ) : (
          'Unknown'
        )}
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