import type { Logger } from '{{IMPORT:core.logger}}';
import type { Mailer, MailMessage } from '{{IMPORT:port.mailer}}';

/**
 * Development mailer: writes emails to the log instead of sending them (the message –
 * including verification / reset links – is logged outside production only).
 *
 * To send real email, implement `Mailer` with your provider (SMTP, SendGrid, Resend…)
 * and wire it where this class is created.
 */
export class LogMailer implements Mailer {
  constructor(
    private readonly logger: Logger,
    private readonly isProduction: boolean,
  ) {}

  async send(message: MailMessage): Promise<void> {
    if (this.isProduction) {
      this.logger.warn({ to: message.to, subject: message.subject }, 'Email NOT sent: no email provider is configured');
      return;
    }
    this.logger.info({ to: message.to, subject: message.subject, text: message.text }, 'Email (development – not sent)');
  }
}
