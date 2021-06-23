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

export function create<AppEvents extends object = any>({
  token,
  debug,
  queueSend = (send, method, data) =>
    send().catch(err => console.error(err, { [method]: data })),
}: {
  token: string
  debug?: boolean
  queueSend?: (
    send: () => Promise<void>,
    method: string,
    data: AnyProps
  ) => Promise<void>
}): Client<AppEvents> {
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
    const trace = Error()
    return queueSend(() => send(method, data, trace), method, data)
  }

  // Send a request.
  function send(method: string, data: AnyProps, trace: Error) {
    return new Promise<void>((resolve, reject) => {
      const url = 'https://api.mixpanel.com/' + pathsByMethod[method]
      const body: AnyProps = { data }
      if (debug) {
        body.verbose = 1
      }
      const payload = encodeBody(body)
      const onError = () => {
        trace.message = 'Network request failed: ' + url
        reject(trace)
      }
      if (useBeacon) {
        if (navigator.sendBeacon(url, payload)) {
          resolve()
        } else {
          onError()
        }
      } else {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', url)
        xhr.setRequestHeader(
          'Content-Type',
          'application/x-www-form-urlencoded'
        )
        if (debug) {
          xhr.responseType = 'json'
        }
        xhr.onload = () => {
          if (debug) {
            const { error } = xhr.response
            if (error) {
              trace.message = error
              reject(trace)
            }
          }
          resolve()
        }
        xhr.onerror = onError
        xhr.send(payload)
      }
    })
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
