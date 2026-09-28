import type { HealthCheck } from '{{IMPORT:port.healthCheck}}';
{{#if AUTH}}
import type { Mailer, MailMessage } from '{{IMPORT:port.mailer}}';

/** Records emails instead of sending them. */
export class FakeMailer implements Mailer {
  readonly sent: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }

  /** The `token` query parameter of the last email sent to `to` (verification / reset links). */
  lastToken(to: string): string {
    const message = this.sent.toReversed().find(m => m.to === to);
    const token = message?.text.match(/token=([\w-]+)/)?.[1];
    if (!token) throw new Error(`No token emailed to ${to}`);
    return token;
  }
}
{{/if}}

export class FakeHealthCheck implements HealthCheck {
  readonly name = 'database';
  healthy = true;

  async check(): Promise<void> {
    if (!this.healthy) throw new Error('down');
  }
}
