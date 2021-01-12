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
  error(...args: any[]): void
}
