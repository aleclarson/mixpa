declare interface XMLHttpRequest {
  onerror: (() => void) | null
  onload: (() => void) | null
  open(method: string, url: string): void
  response: any
  responseType: '' | 'arraybuffer' | 'blob' | 'document' | 'json' | 'text'
  send(data?: any): void
  setRequestHeader(header: string, value: string): void
}

declare const XMLHttpRequest: {
  prototype: XMLHttpRequest
  new (): XMLHttpRequest
}

declare interface Response {
  ok: boolean
  status: number
  json(): Promise<any>
}

declare function fetch(
  url: string,
  init?: { method?: string; body?: any; headers?: any }
): Promise<Response>

declare const console: {
  debug(...args: any[]): void
  error(...args: any[]): void
}

declare const navigator: {
  sendBeacon(url: string, data: string | URLSearchParams): boolean
}

declare const document: {
  visibilityState: 'visible' | 'hidden'
  addEventListener(event: 'visibilitychange', cb: () => void): void
}

declare class URLSearchParams {
  constructor(init?: string)
}
