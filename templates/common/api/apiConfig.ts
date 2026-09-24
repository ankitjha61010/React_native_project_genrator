import type { CreateAxiosDefaults } from 'axios';
import { appConfig } from '{{IMPORT:config.app}}';

export const apiConfig: CreateAxiosDefaults = {
  baseURL: appConfig.api.baseUrl,
  timeout: appConfig.api.timeoutMs,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
};
