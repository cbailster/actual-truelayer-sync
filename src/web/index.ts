/**
 * @file Web server entry point.
 */
import fs from 'fs/promises'
import path from 'node:path'
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import { loadConfig, writeConfig, writeState } from '../config/config'
import { homePage } from './home'
import { getMe, refreshToken } from '../truelayer/truelayer'
import { ConnectionDetails } from './components/connection-list'
import { Config } from '../config/schema'
import { log } from 'node:console'

// Extend FastifyInstance with a decorator for our config
declare module 'fastify' {
  interface FastifyInstance {
    config: Config
  }
}

async function reloadConfig(fastify: import('fastify').FastifyInstance) {
  fastify.config = await loadConfig()
}

const buildApp = async (fastify: import('fastify').FastifyInstance) => {
  // Serve static files from the 'public' directory
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../../public'),
    prefix: '/public/',
  })

  // Decorate fastify with the config and a method to reload it
  fastify.decorate('config', {} as Config)
  await reloadConfig(fastify)

  // Home page route
  fastify.get('/', async (request, reply) => {
    try {
      // Reload config on each page load to reflect any background sync changes
      await reloadConfig(fastify)
      const config = fastify.config
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
      const config = fastify.config

      const connectionState = config.state.connections[connectionName]
      if (!connectionState) {
        return reply.status(404).send({ error: 'Connection not found in state.' })
      }

      const { TRUELAYER_CLIENT_ID, TRUELAYER_CLIENT_SECRET } = config.env
      const { access_token, refresh_token } = await refreshToken(
        TRUELAYER_CLIENT_ID,
        TRUELAYER_CLIENT_SECRET,
        connectionState.refreshToken,
      )
      connectionState.refreshToken = refresh_token
      await writeState(config)
      const me = await getMe(access_token)

      // Update config with new consent info
      const connectionConfig = config.connections.find((c) => c.name === connectionName)
      if (connectionConfig) {
        connectionConfig.consentStatus = me.consent_status
        connectionConfig.consentCreated = me.consent_created_at
        connectionConfig.consentExpires = me.consent_expires_at
        connectionConfig.providerID = me.provider.provider_id
        connectionConfig.lastRefreshed = new Date().toISOString()
        await writeConfig(config)
        await reloadConfig(fastify) // Reload config into decorator
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

  fastify.get('/logo/:connectionName', async (request, reply) => {
    try {
      const { connectionName } = request.params as { connectionName: string }
      const config = fastify.config
      const connectionConfig = config.connections.find((c) => c.name === connectionName)
      if (!connectionConfig || !connectionConfig.providerID) {
        return reply.status(404).send({ error: 'Logo not found for this connection.' })
      }
      // see if the file is already cached in the public directory
      const logoFilePath = path.join(__dirname, '../../public/logos', `${connectionConfig.providerID}.svg`)
      if (await fs.access(logoFilePath).then(() => true).catch(() => false)) {
        fastify.log.info(`Serving cached logo for ${connectionConfig.providerID} from ${logoFilePath}`)
        return reply.sendFile(`logos/${connectionConfig.providerID}.svg`)
      } else {
        // fetch the logo from TrueLayer and cache it
        const logoUrl = `https://providers-assets.truelayer.com/${connectionConfig.providerID}/logo.svg`
        const response = await fetch(logoUrl)
        if (!response.ok) {
          return reply.status(404).send({ error: 'Logo not found on TrueLayer.' })
        }
        const logoData = await response.text()
        await fs.mkdir(path.dirname(logoFilePath), { recursive: true })
        await fs.writeFile(logoFilePath, logoData, 'utf-8')
        return reply.type('image/svg+xml').send(logoData)
      }
    } catch (err) {
      fastify.log.error(err, 'Error loading configuration for web UI')
      reply.status(500).send('Error loading configuration. Check server logs.')
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