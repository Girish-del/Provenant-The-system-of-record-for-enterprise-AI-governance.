import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import type { Action } from '@aegis/core';

export const REQUIRE_ACTION = 'require_action';

/** Marks a route as requiring an RBAC action; enforced by RolesGuard. */
export const RequireAction = (action: Action): CustomDecorator =>
  SetMetadata(REQUIRE_ACTION, action);
