import { createPromiseClient, PromiseClient } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-node'

import { ParserService } from './src/gen/service_connect'
import { DeserializeRequest, Notebook, SerializeRequest } from './src/gen/service_pb'

const transport = createConnectTransport({
  baseUrl: 'http://localhost:8080',
  httpVersion: '1.1'
})

async function main() {
  // const client: PromiseClient<typeof ParserService> = createPromiseClient(ParserService, transport)
  const client: PromiseClient<typeof ParserService>= createPromiseClient(ParserService, transport)
  // serialize something
  const notebook = new Notebook({
    cells: [{ value: 'markdown data', kind: 1 }],
    metadata: {},
    frontmatter: {}
  })
  const serializeRequest = new SerializeRequest()
  serializeRequest.notebook = notebook
  const sr = await client.serialize(serializeRequest)
  console.log('Serialization result:')
  console.log(sr)
  console.log('String: ', new TextDecoder().decode(sr.result))

  // and deserialize it
  const deserializeRequest = new DeserializeRequest()
  deserializeRequest.source = sr.result
  const dr = await client.deserialize(deserializeRequest)
  console.log('DeSerialization result:')
  console.log(dr)
  console.log('String: ', JSON.stringify(dr.notebook))
}

void main()
