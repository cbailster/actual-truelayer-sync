import type { FileConfig } from '../config/schema'
import { Layout } from './layout'
import { ConnectionList } from './components/connection-list'

export const homePage = (config: FileConfig) => {
  const allConnections = config.connections

  return (
    <Layout>
      <div class="mt-8">
        <h2 class="text-xl font-semibold">{allConnections.length} Configured Connections</h2>
        
        <ConnectionList connections={allConnections} />
      </div>
    </Layout>
  )
}