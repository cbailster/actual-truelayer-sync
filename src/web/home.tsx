import { jsx } from 'hono/jsx'
import { Layout } from './layout'

export const homePage = () => (
  <Layout>
    <p class="mt-4">Hello from the web interface!</p>
  </Layout>
)