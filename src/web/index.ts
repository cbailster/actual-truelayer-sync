/**
 * @file Web server entry point.
 */
import path from 'node:path'
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import { loadConfig, writeConfig } from '../config/config'
import { homePage } from './home'
import { getMe, refreshToken } from '../truelayer/truelayer'
import { ConnectionDetails } from './components/connection-list'

const buildApp = async (fastify: import('fastify').FastifyInstance) => {
  // Serve static files from the 'public' directory
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../../public'),
    prefix: '/public/',
  })

  // Home page route
  fastify.get('/', async (request, reply) => {
    try {
      const config = await loadConfig()
      const content = homePage(config)
      reply.type('text/html').send(content.toString())
    } catch (err) {
      fastify.log.error(err, 'Error loading configuration for web UI')
      reply.status(500).send('Error loading configuration. Check server logs.')
    }
  })

  fastify.get('/getMe/:connectionName', async (request, reply) => {
    try {
      const { connectionName } = request.params as { connectionName: string }
      const config = await loadConfig()

      const connectionState = config.state.connections[connectionName]
      if (!connectionState) {
        return reply.status(404).send({ error: 'Connection not found in state.' })
      }

      const { TRUELAYER_CLIENT_ID, TRUELAYER_CLIENT_SECRET } = config.env
      const { access_token } = await refreshToken(
        TRUELAYER_CLIENT_ID,
        TRUELAYER_CLIENT_SECRET,
        connectionState.refreshToken,
      )
      const me = await getMe(access_token)

      // Update config with new consent info
      const connectionConfig = config.connections.find((c) => c.name === connectionName)
      if (connectionConfig) {
        connectionConfig.consentStatus = me.consent_status
        connectionConfig.consentCreated = me.consent_created_at
        connectionConfig.consentExpires = me.consent_expires_at
        connectionConfig.logoUri = me.provider.logo_uri
        connectionConfig.lastRefreshed = new Date().toISOString()
        await writeConfig(config)
      }
      // Re-render the details component with the updated data
      const updatedContent = ConnectionDetails({ connection: connectionConfig! })
      reply.type('text/html').send(updatedContent.toString())
    } catch (err) {
      fastify.log.error(err, 'Error loading configuration for web UI')
      // Return a user-friendly error message to be displayed in the UI
      reply.status(500).send(`<div class="text-error">Error refreshing connection: ${err instanceof Error ? err.message : 'Unknown error'}</div>`)
    }
  })
}

export default buildApp

export async function startServer() {
  const fastify = Fastify({
    logger: true,
  })

  await buildApp(fastify)

  try {
    await fastify.listen({ port: 3000 })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}