import type { Request } from 'express';
import type { SessionData } from '@aegis/core';

/** Express request after AuthGuard has attached the verified session. */
export interface RequestWithSession extends Request {
  session?: SessionData;
}
