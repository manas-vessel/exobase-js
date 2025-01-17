import { hook, response } from '@exobase/core'
import { shake, tryit, unique } from 'radash'

const DEFAULT_METHODS = ['GET', 'OPTIONS', 'PATCH', 'DELETE', 'POST', 'PUT']
const DEFAULT_HEADERS = [
  'X-CSRF-Token',
  'X-Requested-With',
  'Authorization',
  'Accept',
  'Accept-Version',
  'Content-Length',
  'Content-MD5',
  'Content-Type',
  'Date',
  'X-Api-Version'
]

export type UseCorsConfig = {
  /**
   * List of headers the browser should allow in a request
   * made to access the resource you're securing.
   *
   * @deafult X-CSRF-Token, X-Requested-With, Authorization, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version
   */
  headers?: '*' | string[]
  /**
   * List of origins the browser should allow to make a
   * request to access the resource you're securing.
   *
   * @default *
   */
  origins?: '*' | string[]
  /**
   * List of HTTP methods the browser should allow to
   * make a request to the resource you're securing.
   *
   * @default GET, OPTIONS, PATCH, DELETE, POST, PUT
   */
  methods?: '*' | string[]
  /**
   * If true your provided options will be used exclusively
   * If false (default) your provided options, when possible
   * will be appended to the default list of values
   */
  strict?: boolean
  /**
   * If true, the Access-Control-Allow-Credentials will
   * be set to true. Defaults to false.
   */
  credentials?: boolean
}

const origins = (config: UseCorsConfig): string => {
  if (!config.origins) return '*'
  if (config.origins === '*') return '*'
  return config.origins.join(', ')
}

const headers = (config: UseCorsConfig): string => {
  if (!config.headers) return DEFAULT_HEADERS.join(', ')
  if (config.headers === '*') return '*'
  return config.strict === true
    ? config.headers.join(', ')
    : unique([...DEFAULT_HEADERS, ...config.headers]).join(', ')
}

const methods = (config: UseCorsConfig): string => {
  if (!config.methods) return DEFAULT_METHODS.join(', ')
  if (config.methods === '*') return '*'
  return config.strict === true
    ? config.methods.join(', ')
    : unique([...DEFAULT_METHODS, ...config.methods]).join(', ')
}

const credentials = (config: UseCorsConfig): string | undefined => {
  if (!config.credentials) return undefined
  return 'true'
}

export const useCors = (config: UseCorsConfig = {}) =>
  hook(func => {
    const corsHeaders = shake({
      'Access-Control-Allow-Origin': origins(config),
      'Access-Control-Allow-Methods': methods(config),
      'Access-Control-Allow-Headers': headers(config),
      'Access-Control-Allow-Credentials': credentials(config)
    })
    return async props => {
      if (props.request.method.toLowerCase() === 'options') {
        return {
          ...props.response,
          headers: {
            ...props.response.headers,
            ...corsHeaders
          }
        }
      }
      const [err, result] = await tryit(func)(props)
      const r = response(err, result)
      return {
        ...r,
        headers: {
          ...r.headers,
          ...corsHeaders
        }
      }
    }
  })
