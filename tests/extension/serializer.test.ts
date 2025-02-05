import {
  CancellationTokenSource,
  NotebookData,
  NotebookDocument,
  NotebookEdit,
  window,
  workspace,
} from 'vscode'
import { expect, vi, it, describe, beforeEach } from 'vitest'
import { isValid } from 'ulidx'

import { GrpcSerializer, SerializerBase, WasmSerializer } from '../../src/extension/serializer'
import { RunmeIdentity } from '../../src/extension/grpc/serializerTypes'
import type { Kernel } from '../../src/extension/kernel'
import { EventEmitter, Uri } from '../../__mocks__/vscode'
import { Serializer } from '../../src/types'
import ContextState from '../../src/extension/contextState'
import { OutputType } from '../../src/constants'

import fixtureMarshalNotebook from './fixtures/marshalNotebook.json'

globalThis.Go = vi.fn()
globalThis.Runme = { serialize: vi.fn().mockResolvedValue('Hello World!') }

vi.mock('../../src/extension/grpc/client', () => ({
  ParserServiceClient: vi.fn(),
}))

vi.mock('vscode', () => ({
  window: {
    activeNotebookEditor: undefined,
    showErrorMessage: vi.fn().mockResolvedValue({}),
    createOutputChannel: vi.fn(),
    createTextEditorDecorationType: vi.fn().mockResolvedValue({}),
  },
  Uri: { joinPath: vi.fn().mockReturnValue('/foo/bar') },
  workspace: {
    fs: { readFile: vi.fn().mockResolvedValue({}), writeFile: vi.fn() },
    onDidChangeNotebookDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onDidCloseNotebookDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onDidSaveNotebookDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onDidOpenNotebookDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    applyEdit: vi.fn(),
    getConfiguration: vi.fn().mockReturnValue({
      update: vi.fn(),
      get: vi.fn(),
    }),
    notebookDocuments: [],
  },
  commands: { executeCommand: vi.fn() },
  WorkspaceEdit: Map<Uri, NotebookEdit[]>,
  NotebookEdit: {
    updateCellMetadata: (i: number, metadata: any) => ({ i, metadata, type: 'updateCellMetadata' }),
    updateNotebookMetadata: (metadata: any) => ({ metadata, type: 'updateNotebookMetadata' }),
  },
  CancellationTokenSource: vi.fn(),
  NotebookData: class {
    constructor(public cells: any[]) {}
  },
}))

vi.mock('../../src/extension/languages', () => ({
  default: {
    fromContext: vi.fn(),
  },
  NotebookData: class {},
}))

vi.mock('../../src/extension/utils', () => ({
  initWasm: vi.fn(),
}))

vi.mock('../../src/extension/features')

vi.mock('../../src/extension/contextState')

function newKernel(): Kernel {
  return {} as unknown as Kernel
}

describe('SerializerBase', () => {
  const context: any = {
    extensionUri: { fsPath: '/foo/bar' },
  }

  it('serializeNotebook transforms languages', async () => {
    const TestSerializer = class extends SerializerBase {
      public getMaskedCache(_cacheId: string): Promise<Uint8Array> | undefined {
        throw new Error('Method not implemented.')
      }
      public getPlainCache(_cacheId: string): Promise<Uint8Array> | undefined {
        throw new Error('Method not implemented.')
      }
      public getNotebookDataCache(_cacheId: string): NotebookData | undefined {
        throw new Error('Method not implemented.')
      }

      protected async saveNotebookOutputsByCacheId(_cacheId: string): Promise<number> {
        return 0
      }

      public async saveNotebookOutputs(_uri: Uri): Promise<number> {
        return 0
      }

      protected ready: Promise<void | Error> = Promise.resolve()

      protected async saveNotebook(data: NotebookData): Promise<Uint8Array> {
        return data as any
      }

      protected async reviveNotebook(content: Uint8Array): Promise<Serializer.Notebook> {
        return content as any
      }

      protected async preSaveCheck() {}
    }

    const serializer = new TestSerializer({} as any, {} as any)

    const processed = (await serializer['serializeNotebook'](
      {
        cells: [
          {
            languageId: 'shellscript',
          },
          {
            languageId: 'javascriptreact',
          },
          {
            languageId: 'typescriptreact',
          },
          {
            languageId: 'python',
          },
        ],
      } as any,
      {} as any,
    )) as any

    expect(processed.cells).toStrictEqual([
      {
        languageId: 'sh',
      },
      {
        languageId: 'jsx',
      },
      {
        languageId: 'tsx',
      },
      {
        languageId: 'python',
      },
    ])
  })

  describe('handleNotebookSaved', () => {
    const _onDidSaveNotebookDocument = new EventEmitter<NotebookDocument>()

    beforeEach(() => {
      vi.mocked(workspace.onDidSaveNotebookDocument).mockImplementation((l) =>
        _onDidSaveNotebookDocument.event(l),
      )

      vi.mocked(workspace.applyEdit).mockClear()
    })

    it('updates cell names on save', async () => {
      const s = new WasmSerializer(context, newKernel())

      s['deserializeNotebook'] = vi.fn(
        () =>
          ({
            cells: [
              {
                metadata: {
                  'runme.dev/name': 'newName',
                  interactive: true,
                },
              },
            ],
          }) as any,
      )

      const uri = Uri.file('/foo/bar')

      await _onDidSaveNotebookDocument.fireAsync({
        uri,
        cellAt: () => ({ metadata: { 'runme.dev/name': 'oldName', interactive: false } }),
      } as any)

      expect(workspace.applyEdit).toHaveBeenCalledTimes(0)

      // const edit = vi.mocked(workspace.applyEdit).mock.calls[0][0]
      // expect(edit).toBeTruthy()

      // const edits = edit.get(uri)
      // expect(edits).toHaveLength(1)

      // expect(edits[0]).toStrictEqual({
      //   i: 0,
      //   type: 'updateCellMetadata',
      //   metadata: {
      //     interactive: false,
      //     'runme.dev/name': 'newName',
      //   }
      // })
    })
  })
})

describe('WasmSerializer', () => {
  const context: any = {
    extensionUri: { fsPath: '/foo/bar' },
  }

  describe('serializeNotebook', () => {
    it('uses Runme wasm to save the file', async () => {
      // @ts-ignore readonly
      window.activeNotebookEditor = {} as any
      const s = new WasmSerializer(context, newKernel())
      // @ts-ignore readonly
      s['ready'] = Promise.resolve()
      expect(Buffer.from(await s.serializeNotebook({ cells: [] } as any, {} as any))).toEqual(
        Buffer.from('Hello World!'),
      )
    })
  })
})

describe('GrpcSerializer', () => {
  const deepCopyFixture = () => {
    const raw = fixtureMarshalNotebook as any
    return bufferConvert(JSON.parse(JSON.stringify(raw)))
  }

  // item.data.type is an invalid property per the .proto and is an artifiact of JSON.stringify
  // normal execution would see a Buffer object here, not a Buffer-like object
  const bufferConvert = (fixture: any) => {
    fixture.cells.forEach((cell) => {
      cell.outputs.forEach((out) => {
        out.items.forEach((item) => {
          if (item.mime === OutputType.stdout || item.mime === OutputType.terminal) {
            item.data = item.data?.type === 'Buffer' ? Buffer.from(item.data) : item.data
          }
        })
      })
    })
    return fixture
  }

  const context: any = {
    extensionUri: { fsPath: '/foo/bar' },
  }

  const Server = vi.fn().mockImplementation(() => ({
    onTransportReady: vi.fn(),
    ready: vi.fn().mockResolvedValue(null),
  }))

  const Kernel = vi.fn().mockImplementation(() => ({
    hasExperimentEnabled: vi.fn().mockReturnValue(true),
    getRunnerEnvironment: vi.fn().mockImplementation(() => ({
      getSessionId: vi.fn().mockImplementation(() => 'FAKE-SESSION'),
    })),
  }))

  describe('#isDocumentSessionOutputs', () => {
    it('should return false when frontmatter does not include a session ID', () => {
      const fixture = deepCopyFixture()
      const res = GrpcSerializer.isDocumentSessionOutputs(fixture.metadata)
      expect(res).toBeFalsy()
    })

    it('should return false for undefined metadata', () => {
      const res = GrpcSerializer.isDocumentSessionOutputs(undefined)
      expect(res).toBeFalsy()
    })

    it('should return true when frontmatter does include a session ID', () => {
      const res = GrpcSerializer.isDocumentSessionOutputs({
        'runme.dev/frontmatterParsed': { runme: { session: { id: 'my-fake-session' } } },
      })
      expect(res).toBeTruthy()
    })
  })

  describe('#addCellId', () => {
    const copyCell = () =>
      JSON.parse(
        JSON.stringify({
          kind: 2,
          value: '$ date | tee /dev/stderr',
          languageId: 'sh',
          metadata: {
            'runme.dev/id': '01HF7B0KJPF469EG9ZVSTKPEZ6',
            interactive: 'true',
            name: 'stdio-test',
          },
        }),
      )

    it('should never run against cells returned by the kernel', () => {
      const cell = copyCell()
      const res = GrpcSerializer.addCellId(cell.metadata, RunmeIdentity.ALL)
      expect(res['runme.dev/id']).toStrictEqual(cell.metadata['runme.dev/id'])
      expect(res['id']).toBeUndefined()
    })

    it('should add id to cell metadata when identity requires it', () => {
      const cell = { metadata: {} }
      const res = GrpcSerializer.addCellId(cell.metadata, RunmeIdentity.CELL)
      expect(res['runme.dev/id']).toBeDefined()
      expect(isValid(res['runme.dev/id'])).toBeTruthy()
      expect(res['id']).toBeDefined()
      expect(isValid(res['id'])).toBeTruthy()
    })

    it('should only add runme.dev/id to cell metadata when no identity is required', () => {
      const cell = { metadata: {} }
      const res = GrpcSerializer.addCellId(cell.metadata, RunmeIdentity.DOCUMENT)
      expect(res['runme.dev/id']).toBeDefined()
      expect(isValid(res['runme.dev/id'])).toBeTruthy()
      expect(res['id']).toBeUndefined()
    })
  })

  describe('#getDocumentCacheId', () => {
    it('should return the document cache ID if present', () => {
      const fixture = deepCopyFixture()
      const res = GrpcSerializer.getDocumentCacheId(fixture.metadata)
      expect(res).toStrictEqual('01J97S5FVEKBPD9GAH0AZBV0HB')
    })

    it('should return undefined for documents without lifecycle IDs', () => {
      const fixture = deepCopyFixture()
      delete fixture.metadata['runme.dev/cacheId']

      const res = GrpcSerializer.getDocumentCacheId(fixture.metadata)
      expect(res).toBeUndefined()
    })

    it('should return undefined for undefined metadata', () => {
      const res = GrpcSerializer.getDocumentCacheId(undefined)
      expect(res).toBeUndefined()
    })
  })

  describe('#switchLifecycleIdentity', () => {
    const fakeSrcDocUri = { fsPath: '/tmp/fake/source.md' } as any

    it('should not run for session outputs', async () => {
      const fixture = deepCopyFixture()
      fixture.metadata['runme.dev/frontmatterParsed'].runme.session = { id: 'FAKE-SESSION' }

      const serializer: any = new GrpcSerializer(context, new Server(), new Kernel())

      const applied = await serializer.switchLifecycleIdentity(
        {
          uri: fakeSrcDocUri,
          metadata: fixture.metadata,
        },
        1, // aka RunmeIdentity.ALL
      )

      expect(applied).toBeFalsy()
    })

    it('should apply lifecycle identity retaining initial IDs', async () => {
      const fixture = deepCopyFixture()
      const descells = fixture.cells.map((cell, i) => {
        cell.index = i
        const c = { ...cell }
        c.metadata = { ...cell.metadata }
        // simluate different ephemeral IDs here to make sure they are not used once applied
        c.metadata['runme.dev/id'] = c.metadata['runme.dev/id'].toString().slice(0, 10)
        c.metadata['id'] = c.metadata['runme.dev/id']
        return c
      })
      const metadata = { ...fixture.metadata }
      metadata['runme.dev/cacheId'] = metadata['runme.dev/cacheId'].toString().slice(0, 10)

      const serializer: any = new GrpcSerializer(context, new Server(), new Kernel())
      serializer.client = {
        deserialize: vi.fn().mockResolvedValue({
          response: { notebook: { cells: descells, metadata } },
        }),
      }
      vi.mocked(workspace.applyEdit).mockResolvedValue(true)

      const save = vi.fn()
      const applied = await serializer.switchLifecycleIdentity(
        {
          uri: fakeSrcDocUri,
          metadata: fixture.metadata,
          save,
          getCells: vi.fn().mockReturnValue(fixture.cells),
        },
        1, // aka RunmeIdentity.ALL
      )

      const expectedEdits = new Map()
      expectedEdits.set(
        {
          fsPath: '/tmp/fake/source.md',
        },
        [
          {
            metadata: {
              'runme.dev/cacheId': '01J97S5FVEKBPD9GAH0AZBV0HB',
              'runme.dev/finalLineBreaks': '1',
              'runme.dev/frontmatter':
                '---\nrunme:\n  id: 01HF7B0KJPF469EG9ZWDNKKACQ\n  version: v2.0\n---',
              'runme.dev/frontmatterParsed': {
                cwd: '',
                runme: {
                  id: '01HF7B0KJPF469EG9ZWDNKKACQ',
                  version: 'v2.0',
                },
                shell: '',
                skipPrompts: false,
              },
            },
            type: 'updateNotebookMetadata',
          },
          {
            i: 0,
            metadata: {
              id: '01HF7B0KJPF469EG9ZVSTKPEZ6',
              interactive: 'true',
              name: 'stdio-test',
              'runme.dev/id': '01HF7B0KJPF469EG9ZVSTKPEZ6',
            },
            type: 'updateCellMetadata',
          },
          {
            i: 1,
            metadata: {
              background: 'false',
              id: '01HF7B0KJPF469EG9ZVX256S75',
              interactive: 'true',
              'runme.dev/id': '01HF7B0KJPF469EG9ZVX256S75',
            },
            type: 'updateCellMetadata',
          },
        ],
      )

      expect(save).toBeCalled()
      expect(workspace.applyEdit).toBeCalledWith(expectedEdits)
      expect(applied).toBeTruthy()
    })
  })

  describe('cell execution summary marshaling', () => {
    it('should not misrepresenting uninitialized values', () => {
      // i.e. undefined is not sucess=false
      const execSummaryFixture = deepCopyFixture()
      expect(execSummaryFixture.cells.length).toBe(2)

      // set here since JSON does not represent "undefined" as vscode APIs do
      execSummaryFixture.cells[0].executionSummary = {
        success: undefined,
        timing: { startTime: undefined, endTime: undefined },
      }

      const notebookData = GrpcSerializer.marshalNotebook(execSummaryFixture)
      expect(notebookData.cells.length).toBe(2)
      expect(notebookData.cells[0].executionSummary).toBeUndefined()
    })

    it('should wrap raw values for protobuf', () => {
      const execSummaryFixture = deepCopyFixture()
      expect(execSummaryFixture.cells.length).toBe(2)

      const notebookData = GrpcSerializer.marshalNotebook(execSummaryFixture)
      expect(notebookData.cells.length).toBe(2)

      const summary = notebookData.cells[1].executionSummary
      expect(summary?.success).toBeDefined()
      expect(summary?.success?.value).toStrictEqual(false)

      expect(summary?.timing).toBeDefined()
      expect(summary?.timing?.startTime?.value).toStrictEqual('1701444499517')
      expect(summary?.timing?.endTime?.value).toStrictEqual('1701444501696')
    })
  })

  describe('cell outputs marshaling', () => {
    it('should backfill the output type for buffers', () => {
      const outputsFixture = deepCopyFixture()
      expect(outputsFixture.cells.length).toBe(2)

      const notebookData = GrpcSerializer.marshalNotebook(outputsFixture)
      expect(notebookData.cells.length).toBe(2)
      const cells = notebookData.cells[1]
      const items = cells.outputs[0].items
      expect(items.length).toBe(2)
      items.forEach((item) => {
        expect(item.type).toBe('Buffer')
        expect(item.mime).toBeDefined()
      })
      const { processInfo } = cells.outputs[0]
      expect(processInfo?.exitReason).toBeDefined()
      expect(processInfo?.exitReason?.type).toStrictEqual('exit')
      expect(processInfo?.exitReason?.code?.value).toStrictEqual(16)
      expect(processInfo?.pid).toBeDefined()
      expect(processInfo?.pid?.value).toStrictEqual('98354')
    })
  })

  describe('frontmatter handling', () => {
    it('should remove parse frontmatter on serialization', () => {
      const outputsFixture = deepCopyFixture()
      expect(outputsFixture.cells.length).toBe(2)
      expect(outputsFixture.metadata['runme.dev/cacheId']).toBeDefined()
      expect(outputsFixture.metadata['runme.dev/frontmatterParsed']).toBeDefined()
      expect(Object.keys(outputsFixture.metadata).length).toStrictEqual(4)

      const notebookData = GrpcSerializer.marshalNotebook(outputsFixture)
      expect(outputsFixture.metadata['runme.dev/cacheId']).toBeDefined()
      expect(notebookData.metadata['runme.dev/frontmatterParsed']).toBeUndefined()
      expect(Object.keys(notebookData.metadata).length).toStrictEqual(3)
    })
  })

  describe('session file', () => {
    const fakeSrcDocUri = { fsPath: '/tmp/fake/source.md' } as any

    it("maps document lifecycle ids to source doc's URIs on notebook opening", async () => {
      const fixture = deepCopyFixture()
      const cacheId = fixture.metadata['runme.dev/cacheId']

      const serializer: any = new GrpcSerializer(context, new Server(), new Kernel())

      vi.spyOn(GrpcSerializer, 'getOutputsUri').mockReturnValue(fakeSrcDocUri)

      await serializer.handleOpenNotebook({
        uri: fakeSrcDocUri,
        metadata: fixture.metadata,
      })

      const lidDocUri = serializer.cacheDocUriMapping.get(cacheId)
      expect(lidDocUri).toStrictEqual(fakeSrcDocUri)
    })

    describe('#saveNotebookOutputs', () => {
      beforeEach(() => {
        const shouldDisablePreviewOutputs = vi.fn().mockReturnValue(true)
        GrpcSerializer.shouldDisablePreviewOutputs = shouldDisablePreviewOutputs
      })
      const fakeCachedBytes = new Uint8Array([1, 2, 3, 4])
      const serializer: any = new GrpcSerializer(context, new Server(), new Kernel())
      const togglePreviewButton = vi.fn()
      serializer.togglePreviewButton = togglePreviewButton

      it('skips if preview outputs are disabled', async () => {
        const fixture = deepCopyFixture()
        serializer.plainCache.set(
          fixture.metadata['runme.dev/frontmatterParsed'].runme.id,
          fakeCachedBytes,
        )
        await serializer.handleSaveNotebookOutputs({
          uri: fakeSrcDocUri,
          metadata: fixture.metadata,
        })

        expect(workspace.fs.writeFile).toHaveBeenCalledTimes(0)
      })

      it('skips if notebook has zero bytes', async () => {
        const fixture = deepCopyFixture()
        serializer.plainCache.set(
          fixture.metadata['runme.dev/frontmatterParsed'].runme.id,
          undefined,
        )
        await serializer.handleSaveNotebookOutputs({
          uri: fakeSrcDocUri,
          metadata: fixture.metadata,
        })

        expect(workspace.fs.writeFile).toHaveBeenCalledTimes(0)
      })

      it('skips if uri mapping to cacheId is unknown', async () => {
        const fixture = deepCopyFixture()
        serializer.plainCache.set(
          fixture.metadata['runme.dev/frontmatterParsed'].runme.id,
          fakeCachedBytes,
        )
        await serializer.handleSaveNotebookOutputs({
          uri: fakeSrcDocUri,
          metadata: fixture.metadata,
        })

        expect(workspace.fs.writeFile).toHaveBeenCalledTimes(0)
      })

      it('skips if session file mapping is unknown', async () => {
        const fixture = deepCopyFixture()
        serializer.cacheDocUriMapping.set(
          fixture.metadata['runme.dev/frontmatterParsed'].runme.id,
          fakeSrcDocUri,
        )
        serializer.plainCache.set(
          fixture.metadata['runme.dev/frontmatterParsed'].runme.id,
          fakeCachedBytes,
        )
        GrpcSerializer.getOutputsUri = vi.fn().mockImplementation(() => undefined)
        await serializer.handleSaveNotebookOutputs({
          uri: fakeSrcDocUri,
          metadata: fixture.metadata,
        })

        expect(workspace.fs.writeFile).toHaveBeenCalledTimes(0)
      })

      it('skips if runner env session in unknown', async () => {
        const fixture = deepCopyFixture()
        serializer.cacheDocUriMapping.set(
          fixture.metadata['runme.dev/frontmatterParsed'].runme.id,
          fakeSrcDocUri,
        )
        serializer.plainCache.set(
          fixture.metadata['runme.dev/frontmatterParsed'].runme.id,
          fakeCachedBytes,
        )
        serializer.kernel.getRunnerEnvironment = () => ({
          getSessionId: vi.fn().mockImplementation(() => undefined),
        })
        await serializer.handleSaveNotebookOutputs({
          uri: fakeSrcDocUri,
          metadata: fixture.metadata,
        })

        expect(workspace.fs.writeFile).toHaveBeenCalledTimes(0)
      })

      it('writes cached bytes to session file on serialization and save', async () => {
        const fixture = deepCopyFixture()
        const writeableSer: any = new GrpcSerializer(context, new Server(), new Kernel())
        writeableSer.client = {
          serialize: vi.fn().mockResolvedValue({ response: { result: fakeCachedBytes } }),
        }
        writeableSer.cacheDocUriMapping.set(fixture.metadata['runme.dev/cacheId'], fakeSrcDocUri)
        ContextState.getKey = vi.fn().mockImplementation(() => true)
        GrpcSerializer.getOutputsUri = vi.fn().mockImplementation(() => fakeSrcDocUri)

        const result = await writeableSer.serializeNotebook(
          { cells: [], metadata: fixture.metadata } as any,
          new CancellationTokenSource().token,
        )
        expect(result.length).toStrictEqual(4)

        await writeableSer.handleSaveNotebookOutputs({
          uri: fakeSrcDocUri,
          metadata: fixture.metadata,
        })

        expect(workspace.fs.writeFile).toBeCalledWith(fakeSrcDocUri, fakeCachedBytes)
        expect(workspace.fs.writeFile).toHaveBeenCalledTimes(2)
      })
    })

    it('derives its path from notebook source document and session', () => {
      const outputFilePath = GrpcSerializer.getOutputsFilePath(
        '/tmp/fake/runbook.md',
        '01HGX8KYWM9K41YVYP0CNR3TZW',
      )
      expect(outputFilePath).toStrictEqual('/tmp/fake/runbook-01HGX8KYWM9K41YVYP0CNR3TZW.md')
    })

    it('can reverse the process to get the source document path', () => {
      const sourceFilePath = GrpcSerializer.getSourceFilePath(
        '/tmp/fake/runbook-01HGX8KYWM9K41YVYP0CNR3TZW.md',
      )
      expect(sourceFilePath).toStrictEqual('/tmp/fake/runbook.md')
    })

    it('can reverse the process even with mulitple dashes to get the source document path', () => {
      const sourceFilePath = GrpcSerializer.getSourceFilePath(
        '/tmp/fake/my-runbook-01HGX8KYWM9K41YVYP0CNR3TZW.md',
      )
      expect(sourceFilePath).toStrictEqual('/tmp/fake/my-runbook.md')
    })

    it('should include session and document info on serialization', async () => {
      const context: any = {
        extensionUri: { fsPath: '/foo/bar' },
      }
      const fixture = {
        cells: [],
        metadata: {
          'runme.dev/finalLineBreaks': '1',
          'runme.dev/frontmatter':
            '---\nrunme:\n  id: 01HF7B0KJPF469EG9ZWDNKKACQ\n  version: v2.0\n---',
        },
      }

      const serialize = vi.fn().mockImplementation(() =>
        Promise.resolve({
          response: {
            result: new Uint8Array([4, 3, 2, 1]),
          },
        }),
      )
      const ser = new GrpcSerializer(context, new Server(), new Kernel())
      ;(ser as any).cacheDocUriMapping = { get: vi.fn().mockReturnValue(fakeSrcDocUri) }
      ;(ser as any).client = { serialize }

      await (ser as any).cacheNotebookOutputs(fixture, 'irrelevant')

      expect(serialize).toBeCalledWith({
        notebook: {
          cells: [],
          metadata: {
            'runme.dev/finalLineBreaks': '1',
            'runme.dev/frontmatter':
              '---\nrunme:\n  id: 01HF7B0KJPF469EG9ZWDNKKACQ\n  version: v2.0\n---',
          },
        },
        options: {
          outputs: {
            enabled: true,
            summary: true,
          },
          session: {
            document: {
              relativePath: 'source.md',
            },
            id: 'FAKE-SESSION',
          },
        },
      })
    })
  })

  describe('apply cell lifecycle identity', () => {
    it('skips cells if identity does not require it', async () => {
      // make serializer.lifecycleIdentity return 2
      ContextState.getKey = vi.fn().mockImplementation(() => 2)
      const fixture = deepCopyFixture()

      const serializer: any = new GrpcSerializer(context, new Server(), new Kernel())

      fixture.cells.forEach((cell: { kind: number; metadata: { [x: string]: any } }) => {
        cell.metadata['runme.dev/id'] = cell.metadata['id']
        delete cell.metadata['id']
        expect(cell.metadata['id']).toBeUndefined()
      })

      const applied = serializer.applyIdentity(fixture)

      applied.cells.forEach((cell: { metadata: { [x: string]: any } }) => {
        expect(cell.metadata['id']).toBeUndefined()
      })
    })

    it('skips non-code cells', async () => {
      const serializer: any = new GrpcSerializer(context, new Server(), new Kernel())
      const fixture = deepCopyFixture()

      fixture.cells.forEach((cell: { kind: number; metadata: { [x: string]: any } }) => {
        cell.kind = 1
        cell.metadata['runme.dev/id'] = cell.metadata['id']
        delete cell.metadata['id']
        expect(cell.metadata['id']).toBeUndefined()
      })

      const applied = serializer.applyIdentity(fixture)

      applied.cells.forEach((cell: { metadata: { [x: string]: any } }) => {
        expect(cell.metadata['id']).toBeUndefined()
      })
    })

    it('populates code cells with id where deserializer returned runme.dev/id', async () => {
      const serializer: any = new GrpcSerializer(context, new Server(), new Kernel())
      const fixture = deepCopyFixture()

      fixture.cells.forEach((cell: { metadata: { [x: string]: any } }) => {
        delete cell.metadata['id']
        expect(cell.metadata['id']).toBeUndefined()
      })

      // make serializer.lifecycleIdentity return 3
      ContextState.getKey = vi.fn().mockImplementation(() => 3)

      const applied = serializer.applyIdentity(fixture)

      const ref = deepCopyFixture()
      applied.cells.forEach((cell: { metadata: { [x: string]: any } }, i: number) => {
        expect(cell.metadata['id']).toBeDefined()
        expect(cell.metadata['runme.dev/id']).toStrictEqual(ref.cells[i].metadata['runme.dev/id'])
      })
    })
  })
})
