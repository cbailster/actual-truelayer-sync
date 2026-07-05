/**
 * @file Web server entry point.
 */
import path from 'node:path'
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import { homePage } from './home'

export async function startServer() {
  const fastify = Fastify({
    logger: true,
  })

  // Serve static files from the 'public' directory
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../../public'),
    prefix: '/public/',
  })

  // Home page route
  fastify.get('/', (request, reply) => {
    const content = homePage()
    reply.type('text/html').send(content.toString())
  })

  try {
    await fastify.listen({ port: 3000 })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}