import type React from 'react';
import type { PermissionCode } from '../../types';
import { PermissionGate } from './PermissionGate';

/**
 * Higher-order component version of PermissionGate
 *
 * @example
 * const ProtectedComponent = withPermission(MyComponent, PERMISSIONS.ADMIN_VIEW);
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: PermissionCode | PermissionCode[],
  mode: 'all' | 'any' = 'all'
) {
  return function PermissionWrapper(props: P) {
    return (
      <PermissionGate permission={permission} mode={mode}>
        <Component {...props} />
      </PermissionGate>
    );
  };
}
