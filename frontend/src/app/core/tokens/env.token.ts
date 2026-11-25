import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface AppEnvConfig {
  production: boolean;
  apiBaseUrl: string;
  appName: string;
  requestTimeoutMs: number;
  enableDebug: boolean;
}

export const ENV_CONFIG = new InjectionToken<AppEnvConfig>('ENV_CONFIG', {
  providedIn: 'root',
  factory: () => environment,
});
