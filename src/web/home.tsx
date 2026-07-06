import type { FileConfig } from '../config/schema'
import { Layout } from './layout'
import { AccountTable } from './components/account-table'

export const homePage = (config: FileConfig) => {
  const allAccounts = config.connections.flatMap((connection) =>
    connection.accounts.map((account) => ({ ...account, connectionName: connection.name })),
  )

  return (
    <Layout>
      <div class="mt-8">
        <h2 class="text-xl font-semibold">{allAccounts.length} Configured Accounts</h2>
        <AccountTable accounts={allAccounts} />
      </div>
    </Layout>
  )
}