/** A dependency the health endpoint checks (database, cache…). */
export interface HealthCheck {
  readonly name: string;
  /** Resolves when healthy, rejects otherwise. */
  check(): Promise<void>;
}
