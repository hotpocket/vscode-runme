/* eslint-disable @typescript-eslint/no-unused-vars */
import { fastifyConnectPlugin } from '@connectrpc/connect-fastify'
import { fastify } from 'fastify'

import routes from './routes'

async function main() {
  const server = fastify()
  await server.register(fastifyConnectPlugin, {
    routes,
  })
  server.get('/', (_, reply) => {
    reply.type('text/plain')
    reply.send('Hello World!')
  })
  await server.listen({ host: 'localhost', port: 1234 })
  console.log('server is listening at', server.addresses())
}

void main()
