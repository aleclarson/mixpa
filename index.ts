// The navigator.sendBeacon API is only used when the document is hidden,
// since it never lets us handle the response, which is useful for debugging
// and error tracking.
let useBeacon = false
if (typeof navigator !== 'undefined' && typeof document !== 'undefined') {
  useBeacon = document.visibilityState == 'hidden'
  document.addEventListener('visibilitychange', () => {
    useBeacon = document.visibilityState == 'hidden'
  })
}

export interface Client<AppEvents extends object = any> {
  track<E extends PickByType<AppEvents, object>>(
    event: E,
    props: AppEvents[E]
  ): void
  track<E extends PickByType<AppEvents, void>>(event: E): void
  /** Set properties to send with every track request */
  setState(state: SuperProps): void
  /** Identify the current user */
  setUser(userId: string | null): void
  /** Set properties for the current user */
  setUserProps(props: UserProps): Promise<void>
  /** Set properties for another user */
  setUserProps(userId: string, props: UserProps): Promise<void>
}

export interface MixpaError extends Error {
  status?: number
  retry: () => void
}

export interface Config {
  token: string
  /**
   * Debug your requests. Higher values inherit the effects of previous values.
   *
   * - 1: Log requests to the console.
   * - 2: Enable verbose errors.
   * - 3: Skip sending requests at all.
   *
   * @default 0
   */
  debug?: 0 | 1 | 2 | 3
  /**
   * @default https://api.mixpanel.com/
   */
  baseUrl?: string
  /**
   * Control what happens when a request fails. You can rethrow the
   * error to force the original caller to handle it, but you should
   * avoid doing that when `method` equals `"setUser"
   *
   * When undefined, errors are logged and swallowed, which means the
   * original caller has its promise resolved without error. Some browsers
   * block Mixpanel, so acting like requests did not fail in that case
   * allows for a smoother UX.
   */
  onError?: (error: MixpaError, method: string, data: AnyProps) => void
  /**
   * Control when each request is sent.
   *
   * For example, you might wait for a network connection.
   */
  queueSend?: (send: () => void, method: string, data: AnyProps) => void
}

export const noRetryStatus = 418

const logError = (error: MixpaError, method: string, data: AnyProps) =>
  console.error(error, { [method]: data })

export function create<AppEvents extends object = any>({
  token,
  debug = 0,
  baseUrl = 'https://api.mixpanel.com/',
  onError = logError,
  queueSend = send => send(),
}: Config): Client<AppEvents> {
  const state: SuperProps = {}

  return {
    track(event: string, props?: AnyProps) {
      enqueue('track', {
        event,
        properties: {
          ...state,
          ...props,
          token,
        },
      })
    },
    setState(newState) {
      if (debug > 0) {
        console.debug(`[mixpa] setState %O`, newState)
      }
      Object.assign(state, newState)
      state.distinct_id = state.$user_id || state.$device_id
    },
    setUser(userId) {
      this.setState({
        $user_id: userId || undefined,
      })
      if (userId && state.$device_id)
        enqueue('setUser', {
          event: '$identify',
          properties: {
            $identified_id: userId,
            $anon_id: state.$device_id,
            token,
          },
        })
    },
    setUserProps(userId: string | UserProps, props?: UserProps) {
      if (!props) {
        props = userId as any
        userId = state.$user_id
      }
      if (!userId) {
        throw Error('No user exists')
      }
      return enqueue('setUserProps', {
        $token: token,
        $distinct_id: userId,
        $set: props,
      })
    },
  }

  // Queue a request.
  function enqueue(method: string, data: AnyProps) {
    const trace = Error() as MixpaError
    return new Promise<void>((resolve, reject) =>
      queueSend(
        () => {
          if (debug > 0) {
            console.debug(`[mixpa] %O %O`, method, data)
          }
          if (debug > 2) {
            return resolve()
          }
          const url = baseUrl + pathsByMethod[method]
          send(url, data, resolve, (status, message) => {
            trace.message =
              'Mixpa request failed: ' + url + (message ? '\n' + message : '')
            trace.status = status
            trace.retry = () => enqueue(method, data)
            try {
              onError(trace, method, data)
              resolve()
            } catch (error) {
              // Only the `setUserProps` method returns its promise.
              if (method == 'setUserProps') {
                reject(error)
              } else {
                // The rest are considered non-critical.
                logError(error, method, data)
              }
            }
          })
        },
        method,
        data
      )
    )
  }

  // Send a request.
  function send(
    url: string,
    data: AnyProps,
    resolve: (value?: Promise<void>) => void,
    onError: (status?: number, message?: string) => void
  ) {
    const body: AnyProps = { data }
    if (debug > 1) {
      body.verbose = 1
    }
    const payload = encodeBody(body)
    if (useBeacon) {
      if (navigator.sendBeacon(url, new URLSearchParams(payload))) {
        resolve()
      } else {
        onError()
      }
    } else if (typeof fetch !== 'undefined') {
      fetch(url, {
        method: 'POST',
        body: payload,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
        .then(async response => {
          if (debug > 1) {
            const { error } = await response.json()
            if (error) {
              return onError(noRetryStatus, error)
            }
          }
          if (response.ok) {
            resolve()
          } else {
            onError(response.status)
          }
        })
        // Probably lost connection, invalid URL, or CORS error.
        .catch(() => onError(noRetryStatus))
    } else {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', url)
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
      if (debug > 1) {
        xhr.responseType = 'json'
      }
      xhr.onload = () => {
        if (debug > 1) {
          const { error } = xhr.response
          if (error) {
            return onError(noRetryStatus, error)
          }
        }
        resolve()
      }
      // Probably lost connection, invalid URL, or CORS error.
      xhr.onerror = () => onError(noRetryStatus)
      xhr.send(payload)
    }
  }
}

type PickByType<T, U> = Extract<
  { [P in keyof T]: T[P] extends U ? P : never }[keyof T],
  string
>

type AnyProps = { [key: string]: any }

interface SuperProps extends AnyProps {
  /** Application version */
  $app_version_string?: string
  /** Operating system version */
  $os_version?: string
  /** Device model name (eg: "iPad 3,4") */
  $model?: string
  /** Device UUID generated and persisted by you */
  $device_id?: string
  /** The full URL of the webpage on which the event is triggered. */
  $current_url?: string
}

/** https://help.mixpanel.com/hc/en-us/articles/115004708186-Profile-Properties */
interface UserProps extends AnyProps {
  $name?: string
  $first_name?: string
  $last_name?: string
  $referring_domain?: string
  /** The url of a gif, jpg, jpeg, or png for the profile picture. */
  $avatar?: string
  /**
   * The user's email address.
   * You must set this property if you want to send users email from Mixpanel.
   */
  $email?: string
  /**
   * The user's phone number.
   * You must set this property if you want to send users SMS from Mixpanel.
   * Note that a '+' needs to precede phone numbers.
   */
  $phone?: string
  /** Reserved for internal use by Mixpanel */
  bucket?: never
  /** Reserved for internal use by Mixpanel */
  distinct_id?: never
}

const pathsByMethod: Record<string, string> = {
  track: 'track#live-event',
  setUser: 'track#create-identity',
  setUserProps: 'engage#profile-set',
}

function encodeBody(body: AnyProps) {
  let result = ''

  for (const key in body) {
    const value = body[key]
    if (value != null)
      result +=
        (result ? '&' : '') +
        encodeURIComponent(key) +
        '=' +
        encodeURIComponent(
          typeof value == 'object' ? JSON.stringify(value) : value
        )
  }

  return result
}
