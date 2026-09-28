import type { HealthCheck } from '{{IMPORT:port.healthCheck}}';

export interface HealthReport {
  status: 'ok' | 'degraded';
  uptime: number;
  timestamp: string;
  checks: Record<string, 'up' | 'down'>;
}

const TIMEOUT_MS = 2_000;

function withTimeout(promise: Promise<void>): Promise<void> {
  return Promise.race([
    promise,
    new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Health check timed out')), TIMEOUT_MS).unref()),
  ]);
}

/** Liveness + readiness information (database etc.). */
export class HealthService {
  constructor(private readonly checks: HealthCheck[]) {}

  async check(): Promise<HealthReport> {
    const results = await Promise.all(
      this.checks.map(async check => {
        try {
          await withTimeout(check.check());
          return [check.name, 'up'] as const;
        } catch {
          return [check.name, 'down'] as const;
        }
      }),
    );
    const checks = Object.fromEntries(results);
    return {
      status: results.every(([, state]) => state === 'up') ? 'ok' : 'degraded',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
