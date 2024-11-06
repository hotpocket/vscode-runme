/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ConnectRouter } from '@connectrpc/connect'
import { ParserService } from '@buf/stateful_runme.connectrpc_es/runme/parser/v1/parser_connect'
import {
  Notebook,
  DeserializeRequest,
  DeserializeResponse,
  SerializeRequest,
  SerializeResponse,
  FrontmatterRunme,
  Frontmatter,
  Cell,
  CellKind
} from '@buf/stateful_runme.bufbuild_es/runme/parser/v1/parser_pb'

// OLD IMPORT PATHS from manual generation
// from './src/gen/runme/parser/v1/service_pb'
// from './src/gen/runme/parser/v1/service_connect'

// Implementing the Deserialize and Serialize methods
async function deserialize(request: DeserializeRequest): Promise<DeserializeResponse> {
  const markdown = Buffer.from(request?.source).toString('utf8')
  console.log('Deserialize request:', markdown)
  const dummyNotebook = {
    cells: [
      {
        kind: CellKind.MARKUP,
        value: `The length of the input byte array is ${request?.source?.length} bytes.`,
        languageId: '',
        metadata: {},
        // outputs: [],
      } as Cell,
    ],
    metadata: {},
    frontmatter: {
      shell: '',
      cwd: '',
      skipPrompts: false,
      category: '',
      terminalRows: '',
      runme: { id: 'STUB_VALUE', version: 'v3' } as FrontmatterRunme,
    } as Frontmatter,
  } as Notebook
  return new DeserializeResponse({notebook : dummyNotebook})
}

async function serialize(request: SerializeRequest): Promise<SerializeResponse> {
  // let notebook = JSON.stringify(request.notebook)
  // console.log('Serialize request:', notebook)
  const encoder = new TextEncoder()
  const val = `The notebook has ${request.notebook?.cells?.length ?? -1} cell(s)`
  return new SerializeResponse({
    result: encoder.encode(val)
  })
}

export default (router: ConnectRouter) =>
  router.service(ParserService, {
    deserialize: async (req) => deserialize(req),
    serialize: async (req) => serialize(req),
  })
