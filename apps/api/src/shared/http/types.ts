import type { AppConfig } from '../../config';
import type { Clock } from '../kernel';

/** Hono environment shared by every route: Worker bindings plus per-request variables. */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    config: AppConfig;
    clock: Clock;
    requestId: string;
  };
};
