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
      <div id="truelayer-auth" class="flex justify-between items-center" data-client-id={config.env.TRUELAYER_CLIENT_ID}>
        <h2 class="text-xl font-semibold mb-2">TrueLayer Connections</h2>
        <div class="flex gap-2">
          <button
            class="btn btn-sm btn-primary"
            data-scope="accounts balance transactions offline_access"
          >
            Add Bank
          </button>
          <button
            class="btn btn-sm btn-primary"
            data-scope="cards balance transactions offline_access"
          >
            Add Credit Card
          </button>
        </div>
      </div>
      <ConnectionList connections={config.connections} actualClient={actualClient} />
      <script
        dangerouslySetInnerHTML={{
          __html: `
          const authContainer = document.getElementById('truelayer-auth');
          authContainer.addEventListener('click', (event) => {
            const button = event.target.closest("button[data-scope]");
            if (!button) return;

            const scope = button.dataset.scope;
            const clientId = authContainer.dataset.clientId;
            const redirectUri = window.location.origin + "/callback";
            const params = new URLSearchParams({
              response_type: "code", client_id: clientId, scope: scope, redirect_uri: redirectUri, providers: "uk-ob-all uk-oauth-all",
            });
            window.location.href = "https://auth.truelayer.com/?" + params.toString();
          });
        `,
        }}
      ></script>
    </Layout>
  )
}