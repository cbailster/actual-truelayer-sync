/**
 * @file Web server entry point.
 */
import fs from 'fs/promises'
import path from 'node:path'
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import fastifyCookie from '@fastify/cookie'
import fastifySession from '@fastify/session'
import fastifyFormbody from '@fastify/formbody'

import { homePage } from './home'
import { MapAccountPage } from './map-accounts'
import { ConnectionDetails } from './components/connection-list'

import { ActualClient } from './actual-client'
import { mapToConnection } from './utils/connection'

import { loadConfig, writeConfig, writeState } from '../config/config'
import { Config, Connection, FileConfigSchema } from '../config/schema'
import { getMe, refreshToken, exchangeCode, listAccounts, listCards} from '../truelayer/truelayer'
import { TrueLayerMe, TrueLayerAccount, TrueLayerCard } from '../truelayer/types'

interface SessionData {
  connection?: Connection
  tokens?: { access_token: string; refresh_token: string }
}

// Extend FastifyInstance with a decorator for our config
declare module 'fastify' {
  interface FastifyInstance {
    config: Config
    actualClient: ActualClient
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Session extends SessionData {}
}

async function reloadConfig(fastify: import('fastify').FastifyInstance) {
  fastify.config = await loadConfig()
}

async function updateStateJson(config: Config, name:string, refreshToken:string) {
  config.state.connections[name] = { 
    refreshToken: refreshToken,
    accounts: {}
  }
  await writeState(config)
}

function getMappingOptions(accounts: ActualClient['accounts']) { 
  return [
    ...accounts.sort((a, b) => (`${a.budgetName}${a.name}` > `${b.budgetName}${b.name}` ? 1 : -1)).map((account) => ({
      id: account.id,
      name: `${account.name} (${account.budgetName})`
    })),
    { id: 'IGNORE', name: 'Ignore this account' },
  ]
}

const buildApp = async (fastify: import('fastify').FastifyInstance) => {
  // Serve static files from the 'public' directory
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../../public'),
    prefix: '/public/',
  })

  // Register formbody to parse application/x-www-form-urlencoded
  await fastify.register(fastifyFormbody)

  // Register cookie and session plugins
  await fastify.register(fastifyCookie)
  await fastify.register(fastifySession, {
    // TODO: Move this to an environment variable for production
    secret: process.env.SESSION_SECRET || 'a-very-long-and-super-secret-key-for-sessions',
    cookie: { secure: process.env.NODE_ENV === 'production' },
  })

  // Decorate fastify with the config and a method to reload it
  fastify.decorate('config', {} as Config)
  await reloadConfig(fastify)

  // Decorate fastify with the ActualClient instance
  const actualClient = new ActualClient(fastify.config.env)
  fastify.decorate('actualClient', actualClient)

  try {
    await actualClient.connect()
    await actualClient.getAccounts() // Load accounts on startup
  } catch (err) {
    fastify.log.error(err, 'Failed to connect to Actual Budget during startup.')
  }


  // Home page route
  fastify.get('/', async (request, reply) => {
    try {
      // Reload config on each page load to reflect any background sync changes
      await reloadConfig(fastify)
      const config = fastify.config
      const { error } = request.query as { error?: string }
      const content = homePage(config, fastify.actualClient.status, fastify.actualClient, error)
      reply.type('text/html').send(content.toString())
    } catch (err) {
      fastify.log.error(err, 'Error loading configuration for web UI')
      reply.status(500).send('Error loading configuration. Check server logs.')
    }
  })

  fastify.get('/callback-test', async (request, reply) => {
    const medata:TrueLayerMe = { 
      credentials_id: '123', 
      client_id: '456', 
      consent_status: 'granted', 
      consent_created_at: '2022-01-01T00:00:00Z', 
      consent_expires_at: '2022-01-01T00:00:00Z', 
      provider: { display_name: 'Monzo Bank', provider_id: 'test-provider' },
      scopes: []
    }
    const acList:TrueLayerAccount[] = [
      { account_id: '1', account_type: 'TRANSACTION', currency: 'GBP', display_name: 'Test Account', account_number: { number: '12345678' }, provider: { provider_id: 'test-provider' }, update_timestamp: '2022-01-01T00:00:00Z'},
      { account_id: '2', account_type: 'TRANSACTION', currency: 'GBP', display_name: 'Another Test Account', account_number: { number: '12349870' }, provider: { provider_id: 'test-provider' }, update_timestamp: '2022-01-01T00:00:00Z'}
    ]
    const connection:Connection = mapToConnection(medata, acList, {})

    request.session.set('connection', connection)
    request.session.set('tokens', { access_token: 'abc', refresh_token: 'def' })
    return reply.redirect('/map-accounts')
  })

  fastify.get('/map-accounts', async (request, reply) => {
    
    const { connection, tokens } = request.session
    if (!connection || !tokens) {
      fastify.log.warn('Attempted to access /map-accounts without session data.')
      return reply.redirect('/?error=session_expired')
    }

    const mappingOptions = getMappingOptions(fastify.actualClient.accounts)
    
    const content = MapAccountPage({ tokens, connection, mappingOptions })
    reply.type('text/html').send(content.toString())
  })

  fastify.post('/map-accounts', async (request, reply) => {
    const { connection, tokens } = request.session
    if (!connection || !tokens) {
      fastify.log.warn('Attempted to access /map-accounts without session data.')
      return reply.redirect('/?error=session_expired')
    }

    // Update connection object from form data
    const body = request.body as Record<string, string>
    connection.name = body.connectionName
    for (const account of connection.accounts) {
      const accountId = body[`map-${account.trueLayerId}`]
      const actualAccount = fastify.actualClient.accountWithID(accountId)
      if (actualAccount) {
        account.actualId = actualAccount.id,
        account.budgetId = actualAccount.budgetId
      } else {
        account.actualId = ''
        account.budgetId = ''
      }
    }

    // Validate the connection object
    const connectionCopy = { ...connection }  
    connectionCopy.accounts = connectionCopy.accounts.filter(account => account.actualId !== '')
    const { env, state, ...fileConfig } = fastify.config
    const configForValidation = {
      ...fileConfig,
      connections: [...fileConfig.connections, connectionCopy],
    }
    const validationResult = FileConfigSchema.safeParse(configForValidation)

    // If invalid, re-render the form with errors, otherwise save and redirect to home page
    if (!validationResult.success) {
      const mappingOptions = getMappingOptions(fastify.actualClient.accounts)
      const content = MapAccountPage({ tokens, connection, mappingOptions, errors: validationResult.error })
      return reply.type('text/html').status(400).send(content.toString())
    }

    // TODO: If valid, save the connection and redirect
    fastify.config.connections.push(connectionCopy)
    await writeConfig(fastify.config)
    await updateStateJson(fastify.config, connection.name, tokens.refresh_token)
    await reloadConfig(fastify)
    return reply.redirect('/')
  })

  // Page to handle the redirect from TrueLayer
  fastify.get('/callback', async (request, reply) => {
    try {
      // 1. Parse auth code
      const code = (request.query as { code?: string }).code as string
      if (!code) {
        return reply.redirect('/?error=auth_failed')
      }
      // 2. Exchange code for tokens
      let tokens: { access_token: string; refresh_token: string }
      try {
        const redirectUri = request.protocol + '://' + request.hostname + (request.port != 80 && request.port != 443 ? `:${request.port}` : '') + '/callback'
        tokens = await exchangeCode(fastify.config.env.TRUELAYER_CLIENT_ID, fastify.config.env.TRUELAYER_CLIENT_SECRET, code, redirectUri)
      } catch (err) {
        fastify.log.error(err, `Error exchanging code for tokens ${err instanceof Error ? err.message : String(err)}`)
        return reply.redirect('/?error=auth_failed')
      }
      // 3. Fetch provider name for connection name default
      const me = await getMe(tokens.access_token)
      // 4. Fetch TrueLayer accounts / cards
      let tlAccounts: (TrueLayerAccount | TrueLayerCard)[] = []
      if (me.scopes.includes('cards')) {
        tlAccounts = await listCards(tokens.access_token)
      } else {
        tlAccounts = await listAccounts(tokens.access_token)
      }
      const connection:Connection = mapToConnection(me, tlAccounts, {})

      // Store connection data in session
      request.session.set('connection', connection)
      request.session.set('tokens', tokens)

      return reply.redirect('/map-accounts')
    } catch (err) {
      fastify.log.error(err, 'Error handling callback from Truelayer')
      reply.status(500).send('Error handling callback from Truelayer. Check server logs.')
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

      const { access_token, refresh_token } = await refreshToken(
        config.env.TRUELAYER_CLIENT_ID,
        config.env.TRUELAYER_CLIENT_SECRET,
        connectionState.refreshToken,
      )
      if (refresh_token != connectionState.refreshToken) {
        connectionState.refreshToken = refresh_token
        await writeState(config)
      }
      const me = await getMe(access_token)
      console.log(me)

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