/**
 * @file Web server entry point.
 */
import path from 'node:path'
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import { loadConfig } from '../config/config'
import { homePage } from './home'

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