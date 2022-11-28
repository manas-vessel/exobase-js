import type { Handler, Props } from '@exobase/core'
import { error } from '@exobase/core'
import { isArray, isFunction, isString, sift } from 'radash'
import cani, { CaniServices } from './cani'
import * as perm from './permission'
import type { Permission, PermissionKey } from './types'

export type UseAuthorizationOptions<TProps extends Props> = {
  /**
   * A function that returns a list of permissions the current
   * user possess.
   */
  permissions: (props: TProps) => Permission[] | PermissionKey[]
  /**
   * The permission(s) that the endpoint requires. If the user
   * does not have permissions (known by the `permissions` property)
   * sufficent enough to cover this requirement an authorization
   * error will be thrown.
   */
  require?:
    | PermissionKey
    | PermissionKey[]
    | Permission
    | Permission[]
    | ((
        props: TProps
      ) =>
        | Permission
        | Permission[]
        | PermissionKey
        | PermissionKey[]
        | Promise<Permission>
        | Promise<Permission[]>
        | Promise<PermissionKey>
        | Promise<PermissionKey[]>)
}

export async function withAuthorization<TProps extends Props>(
  func: Handler<TProps & { auth: TProps['auth'] & CaniServices }>,
  options: UseAuthorizationOptions<TProps>,
  props: TProps
) {
  const has = options.permissions(props)
  const user = cani.user(has)
  const raw = options.require
    ? await Promise.resolve(
        isFunction(options.require) ? options.require(props) : options.require
      )
    : null
  const requires = sift(isArray(raw) ? raw : [raw])
  for (const required of requires) {
    if (!user.do(required)) {
      const key = isString(required)
        ? required
        : required.name ?? perm.stringify(required)
      throw error({
        status: 401,
        message: 'Not Authorized',
        info: `Missing required permission (${key}) to call this function`,
        key: 'exo.err.authorization.failed'
      })
    }
  }
  return await func({
    ...props,
    auth: {
      ...props.auth,
      cani: user
    }
  })
}

export const useAuthorization: <TProps extends Props>(
  options: UseAuthorizationOptions<TProps>
) => (
  func: Handler<TProps & { auth: TProps['auth'] & CaniServices }>
) => Handler<TProps> = options => func => props =>
  withAuthorization(func, options, props)
