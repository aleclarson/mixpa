export interface Client<AppEvents extends object = any> {
  track<Event extends PickByType<AppEvents, object>>(
    event: Event,
    props: AppEvents[Event]
  ): void
  track<Event extends PickByType<AppEvents, void>>(event: Event): void
  track(event: ReservedEvent, props?: AnyProps): void
  /** Set properties to send with every track request */
  setState(state: ReservedState): void
  /** Identify the current user */
  setUser(userId: string | null): void
  /** Set properties for the current user */
  setUserProps(props: AnyProps): void
}

export interface Config {
  token: string
  debug?: boolean
  shouldSend?: () => boolean | Promise<boolean>
}

export function create({ token, debug, shouldSend }: Config) {
  const state: ReservedState = {}

  return <Client>{
    track(event: string, props?: AnyProps) {
      post('track#live-event', {
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
    },
    setUser(userId) {
      state.$user_id = userId
      if (userId)
        post('track#create-identity', {
          event: '$identify',
          properties: {
            $identified_id: userId,
            $anon_id: state.$device_id,
            token,
          },
        })
    },
    setUserProps(props) {
      if (!state.$user_id) {
        throw Error('No user exists')
      }
      post('engage#profile-set', {
        $token: token,
        $distinct_id: state.$user_id,
        $set: props,
      })
    },
  }

  // Send a POST request.
  function post(path: string, data: AnyProps) {
    send(path, { data }, Error())
  }

  // Send a request.
  async function send(path: string, body: AnyProps, trace: Error) {
    if (!shouldSend || (await shouldSend())) {
      const url = `https://api.mixpanel.com/${path}`
      const xhr = new XMLHttpRequest()
      xhr.open('POST', url)
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
      if (debug) {
        xhr.responseType = 'json'
        body.verbose = 1
      }
      if (debug)
        xhr.onload = () => {
          const { error } = xhr.response
          if (error) {
            trace.message = error
            console.error(trace, body)
          }
        }
      xhr.onerror = () => {
        trace.message = 'Network request failed: ' + url
        console.error(trace)
      }
      xhr.send(encodeBody(body))
    }
  }
}

type PickByType<T, U> = Extract<
  { [P in keyof T]: T[P] extends U ? P : never }[keyof T],
  string
>

type AnyProps = { [key: string]: any }

type ReservedEvent = '$session_start' | '$session_end'

interface ReservedState extends AnyProps {
  /** Application version */
  $app_version_string?: string
  /** Operating system version */
  $os_version?: string
  /** Device model name (eg: "iPad 3,4") */
  $model?: string
  /** Device UUID generated and persisted by you */
  $device_id?: string
}

function encodeBody(body: AnyProps) {
  let result = ''

  for (const key in body) {
    let value = body[key]
    if (value == null) {
      continue
    }

    const type = typeof value
    value =
      type == 'object'
        ? JSON.stringify(value)
        : type == 'string'
        ? encodeURIComponent(value)
        : type == 'number'
        ? value
        : ''

    if (value !== '') {
      result += (result ? '&' : '') + encodeURIComponent(key) + '=' + value
    }
  }

  return result
}
