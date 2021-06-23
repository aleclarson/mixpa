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
