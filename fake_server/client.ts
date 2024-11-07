import { createPromiseClient, PromiseClient } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-node'
import {
  DeserializeRequest,
  SerializeRequest,
  Notebook
} from '@buf/stateful_runme.bufbuild_es/runme/parser/v1/parser_pb'
import { ParserService } from '@buf/stateful_runme.connectrpc_es/runme/parser/v1/parser_connect'

// OLD MANUAL IMPORT PATHS from manual generation
// import { DeserializeRequest, SerializeRequest, Notebook } from './src/gen/runme/parser/v1/service_pb'
// import { ParserService } from './src/gen/runme/parser/v1/service_connect'

const transport = createConnectTransport({
  baseUrl: 'http://localhost:8080',
  httpVersion: '1.1'
})

async function main() {
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
