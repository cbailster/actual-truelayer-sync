import { jsx } from 'hono/jsx'
import { Layout } from './layout'
import { ConnectionList } from './components/connection-list'
import type { Config } from '../config/schema'
import type { ActualConnectionStatus } from './actual-client'
import { ActualClient } from './actual-client'

export const homePage = (config: Config, actualClientStatus: ActualConnectionStatus, actualClient: ActualClient) => {
  return (
    <Layout>
      <div class="m-4 flex items-center gap-2">
        <span class="text-lg font-semibold">Actual Budget</span>
        <span class={`badge ${actualClientStatus === 'connected' ? 'badge-success' : actualClientStatus === 'error' ? 'badge-error' : 'badge-warning'}`}>
          {actualClientStatus}
        </span>
      </div>
      <h2 class="text-xl font-semibold mb-2">TrueLayer Connections</h2>
      <ConnectionList connections={config.connections} actualClient={actualClient} />
    </Layout>
  )
}