# mixpa

[![npm](https://img.shields.io/npm/v/mixpa.svg)](https://www.npmjs.com/package/mixpa)
[![Bundle size](https://badgen.net/bundlephobia/min/mixpa)](https://bundlephobia.com/result?p=mixpa)
[![Code style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://paypal.me/alecdotbiz)

Tiny, isomorphic client for Mixpanel

## Usage

```ts
import { create } from 'mixpa'

export const mp = create({
  token: '2418e6a0238911541536b590a76e2b01',
  debug: false,
})
```

### Options

- `token: string`  
  Your project token.

- `baseUrl?: string`  
  The domain to send requests to.

- `debug?: 0 | 1 | 2 | 3`  
  Debug your requests. Higher values inherit the effects of lower values.

  - 1: Log requests to the console.
  - 2: Enable verbose error messages.
  - 3: Skip sending requests entirely.

- `onError?: (error: Error, req: MixpaRequest) => void`  
   Control what happens when a request fails. You can rethrow the error to force the original caller to handle it, but rethrown errors for non-critical requests are just logged to the console.

- `queueSend?: (send: () => void, method: string, data: object) => void`  
  Control when each request is sent. For example, you might wait for a network connection.  
  By default, requests are sent immediately.

&nbsp;

### Event Types

Tracked events can be strongly typed.

```ts
type Events = {
  openApp: void
  sharePost: { postId: string }
}

export const mp = create<Events>({ ... })

mp.track('sharePost') // Error: "sharePost" is not assignable to "openApp"
```

&nbsp;

### Notes

- No properties are ever set automatically.
- You'll want to call `setState` with "reserved" properties (eg: `$device_id`) before you track any events.
- You must've called `setUser` with a string before you can call `setUserProps`.

&nbsp;

### API

To track an event:

```ts
mp.track('My Event', { ... })
```

&nbsp;

To identify the user:

```ts
mp.setUser('6ab86a11-9958-4afd-bf01-7a06d8d3f8a4')
```

&nbsp;

To forget the user:

```ts
mp.setUser(null)
```

&nbsp;

To update user-specific properties:

```ts
mp.setUserProps({ ... })
```

&nbsp;

To send properties with every `track` call:

```ts
mp.setState({ ... })
```
