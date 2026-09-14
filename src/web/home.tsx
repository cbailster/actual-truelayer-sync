import { jsx } from 'hono/jsx'
import { Layout } from './layout'
import { ConnectionList } from './components/connection-list'
import type { Config } from '../config/schema'
import type { ActualConnectionStatus } from './actual-client'
import { ActualClient } from './actual-client'

export const homePage = (
  config: Config,
  callbackUri: string,
  actualClientStatus: ActualConnectionStatus,
  actualClient: ActualClient,
  error?: string,
) => {
  return (
    <Layout>
      {error === 'auth_failed' && (
        <div class="alert alert-error mb-4 mt-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>Authentication with TrueLayer failed. Please try again.</span>
        </div>
      )}
      {error === 'session_expired' && (
        <div class="alert alert-error mb-4 mt-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>Missing session data for account mapping. Please try again.</span>
        </div>
      )}
      <div class="m-4 flex items-center gap-2">
        <span class="text-lg font-semibold">Actual Budget</span>
        <span class={`badge ${actualClientStatus === 'connected' ? 'badge-success' : actualClientStatus === 'error' ? 'badge-error' : 'badge-warning'}`}>
          {actualClientStatus}
        </span>
      </div>
      <div id="truelayer-auth" class="flex justify-between items-center">
        <h2 class="text-xl font-semibold mb-2">TrueLayer Connections</h2>
        <div class="flex gap-2">
          <a
            href={`https://auth.truelayer.com/?response_type=code&client_id=${config.env.TRUELAYER_CLIENT_ID}&scope=accounts%20balance%20transactions%20offline_access&redirect_uri=${encodeURIComponent(callbackUri)}&providers=uk-ob-all%20uk-oauth-all`}
            class="btn btn-sm btn-primary"
          >
            Add Bank
          </a>
          <a
            href={`https://auth.truelayer.com/?response_type=code&client_id=${config.env.TRUELAYER_CLIENT_ID}&scope=cards%20balance%20transactions%20offline_access&redirect_uri=${encodeURIComponent(callbackUri)}&providers=uk-ob-all%20uk-oauth-all`}
            class="btn btn-sm btn-primary"
          >
            Add Credit Card
          </a>
        </div>
      </div>
      <ConnectionList connections={config.connections} actualClient={actualClient} callbackUri={callbackUri} clientId={config.env.TRUELAYER_CLIENT_ID} />
    </Layout>
  )
}