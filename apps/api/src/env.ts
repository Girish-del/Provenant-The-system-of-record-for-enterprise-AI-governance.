import { parseEnv } from '@aegis/config/env';

/** Validated environment, parsed once at startup (throws on missing/invalid). */
export const env = parseEnv();
