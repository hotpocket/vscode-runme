import { suite, test, expect, vi } from 'vitest'
import { Uri, type ExtensionContext, type WebviewView } from 'vscode'

import Panel from '../../../src/extension/panels/panel'

vi.mock('vscode')
vi.mock('vscode-telemetry')

vi.mock('../../../src/extension/grpc/client', () => ({}))
vi.mock('../../../src/extension/runner', () => ({}))

vi.mock('../../../src/extension/utils', () => {
  return {
    fetchStaticHtml: vi.fn().mockResolvedValue({
      text: vi
        .fn()
        .mockResolvedValue(
          '<script id="appAuthToken">window.APP_STATE = JSON.parse(\'{ "appToken": null }\');</script>'
        ),
    }),
  }
})

suite('Panel', () => {
  const staticHtml =
    '<script id="appAuthToken">window.APP_STATE = JSON.parse(\'{ "appToken": null }\');</script>'
  const contextMock: ExtensionContext = {
    extensionUri: Uri.parse('file:///Users/fakeUser/projects/vscode-runme'),
  } as any
  const view: WebviewView = { webview: { html: '' } } as any

  test('hydrates HTML', () => {
    const p = new Panel(contextMock, 'testing')
    const hydrated = p.hydrateHtml(staticHtml, {
      appToken: 'a.b.c',
      ide: 'code',
      panelId: 'main',
      defaultUx: 'panels',
    })

    expect(hydrated).toContain('<base href="http://localhost:3001">')
    expect(hydrated).toContain(
      '{"appToken":"a.b.c","ide":"code","panelId":"main","defaultUx":"panels"}'
    )
  })

  test('resovles authed', async () => {
    const p = new Panel(contextMock, 'testing')
    p.getAppToken = vi.fn().mockResolvedValue({ token: 'webview.auth.token' })

    await p.resolveWebviewTelemetryView(view)

    expect(view.webview.html).toContain('<base href="http://localhost:3001">')
    expect(view.webview.html).toContain(
      '{"ide":"code","panelId":"testing","appToken":"webview.auth.token","defaultUx":"panels"}'
    )
  })

  test('resovles unauthed', async () => {
    const p = new Panel(contextMock, 'testing')
    p.getAppToken = vi.fn().mockResolvedValue(null)

    await p.resolveWebviewTelemetryView(view)

    expect(view.webview.html).toContain('<base href="http://localhost:3001">')
    expect(view.webview.html).toContain(
      '{"ide":"code","panelId":"testing","appToken":"EMPTY","defaultUx":"panels"}'
    )
  })
})