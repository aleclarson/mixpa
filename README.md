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
  shouldSend() {
    // Return false to prevent sending.
    // Return a promise to postpone sending.

    // Must resolve with true to allow sending.
    return true
  },
})
```

### Options

- `token: string` 
  Your project token.

- `debug?: boolean` 
  Enable verbose responses to debug invalid requests.

- `shouldSend?: Function` 
  Control when requests are sent. Useful when the network is down.

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

### Notes

- No properties are ever set automatically.
- You'll want to call `setState` with "reserved" properties (eg: `$device_id`) before you track any events.
- You must've called `setUser` with a string before you can call `setUserProps`.

&nbsp;

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

``ts
mp.setUserProps({ ... })
```

&nbsp;

To send properties with every `track` call:

```ts
mp.setState({ ... })
```
