/* eslint-disable quotes */
import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { spawn, ChildProcess } from 'node:child_process'

import {
  createPromiseClient,
  PromiseClient,
  Transport,
} from '@connectrpc/connect'
import {
  ConnectTransportOptions,
  GrpcTransportOptions,
} from '@connectrpc/connect-node'
import {
  createConnectTransport,
  createGrpcTransport,
} from '@connectrpc/connect-node'
import {
  DeserializeRequest,
  SerializeRequest,
  Notebook,
} from '@buf/stateful_runme.bufbuild_es/runme/parser/v1/parser_pb'
import { ParserService } from '@buf/stateful_runme.connectrpc_es/runme/parser/v1/parser_connect'

// Parse command-line arguments
const args = process.argv.slice(2)
let protocol = 'grpc' as 'grpc' | 'connect'
let useTls = false

args.forEach((arg) => {
  if (arg.startsWith('--protocol=')) {
    const value = arg.split('=')[1]
    if (value === 'grpc' || value === 'connect') {
      protocol = value as 'grpc' | 'connect'
    } else {
      console.warn(`Invalid protocol: ${value}. Using default 'grpc'.`)
    }
  } else if (arg.startsWith('--useTls=')) {
    const value = arg.split('=')[1]
    useTls = value === 'true'
  }
})

// Config
let transport: Transport
const host = 'localhost'
const port = 9999
const tlsPath = path.normalize(__dirname + '/../tls')
const keyPath = `${tlsPath}/key.pem`
const certPath = `${tlsPath}/cert.pem`
let config = {
  baseUrl: `http://${host}:${port}`,
  httpVersion: '1.1',
  nodeOptions: {},
} as ConnectTransportOptions | GrpcTransportOptions
const serverBinary = path.normalize('../bin/runme')
const serverArgs = [
  'server',
  '--address', `${host}:${port}`,
  '--tls', `${tlsPath}`,
  '--runner', ...(useTls ? [] : [`--insecure`])
]

let serverProcess: ChildProcess | null = null

async function isServerRunning(port: number, host: string = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    // it's running if we can connect to it
    const client = net.createConnection({ port, host }, () => {
      client.end() // Close this test connection
      resolve(true) // Server is running
    })
    // it's not running if we can't connect to it
    client.on('error', () => { resolve(false) })
  })
}

// Function to spawn the server process
function spawnServer(): void {
  const fullCommand = `${serverBinary} ${serverArgs.join(' ')}`
  console.log('Starting server with command:')
  console.log(fullCommand)

  serverProcess = spawn(serverBinary, serverArgs, { stdio: 'inherit' })

  serverProcess.on('error', (error) => {
    console.error('Failed to start server process:', error)
  })

  serverProcess.on('exit', (code) => {
    console.log(`Server process exited with code ${code}`)
  })

  console.log('Server process spawned successfully.')
}

// Function to kill the server process
function killServer(): void {
  if (serverProcess) {
    console.log('Killing server process...')
    serverProcess.kill()
    serverProcess = null
  }
}

// Function to initialize the transport configuration
function setupTransport() {
  if (protocol === 'connect') {
    transport = createConnectTransport(config)
  } else if (protocol === 'grpc') {
    config.httpVersion = '2'
    if (useTls) {
      config.baseUrl = `https://${host}:${port}`
      const cert = fs.readFileSync(certPath)
      const key = fs.readFileSync(keyPath)
      config.nodeOptions = {
        cert,
        key,
        rejectUnauthorized: false, // Use only in dev for self-signed certificates
      }
    }
    transport = createGrpcTransport(config)
  }
}

// Main function
async function main() {
  try {
    console.log(`Using protocol: ${protocol}`)
    console.log(`Using TLS: ${useTls}`)

    // Check if server is running
    const running = await isServerRunning(port, host)
    if (!running) {
      console.log('Server is not running. Spawning the server...')
      spawnServer()
      // Wait a few seconds for the server to start
      await new Promise((resolve) => setTimeout(resolve, 5000))
    } else {
      console.log('Server is already running.')
    }

    // Set up the transport
    setupTransport()

    const client: PromiseClient<typeof ParserService> = createPromiseClient(ParserService, transport)

    // Serialize something
    const notebook = new Notebook({
      cells: [{ value: 'markdown data', kind: 1 }],
      metadata: {},
      frontmatter: {},
    })
    const serializeRequest = new SerializeRequest()
    serializeRequest.notebook = notebook
    const sr = await client.serialize(serializeRequest)
    console.log('Serialization result:')
    console.log(sr)
    console.log('String: ', new TextDecoder().decode(sr.result))

    // And deserialize it
    const deserializeRequest = new DeserializeRequest()
    deserializeRequest.source = sr.result
    const dr = await client.deserialize(deserializeRequest)
    console.log('DeSerialization result:')
    console.log(dr)
    console.log('String: ', JSON.stringify(dr.notebook))
  } catch (error) {
    console.error('Error during execution:', error)
  } finally {
    // Kill the server process if it was spawned by this script
    killServer()
  }
}

void main()
