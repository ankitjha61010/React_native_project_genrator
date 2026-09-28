import { createTransport, type Transporter } from 'nodemailer';
import type { Logger } from '{{IMPORT:core.logger}}';
import type { Mailer, MailMessage } from '{{IMPORT:port.mailer}}';

/** Sends email through SMTP (any provider: SES, SendGrid, Mailgun, Gmail…). */
export class SmtpMailer implements Mailer {
  private readonly transport: Transporter;

  constructor(
    smtpUrl: string,
    private readonly from: string,
  ) {
    this.transport = createTransport(smtpUrl);
  }

  async send(message: MailMessage): Promise<void> {
    await this.transport.sendMail({ from: this.from, ...message });
  }
}

/** Development: writes emails (and their codes) to the log instead of sending them. */
export class LogMailer implements Mailer {
  constructor(
    private readonly logger: Logger,
    private readonly isProduction: boolean,
  ) {}

  async send(message: MailMessage): Promise<void> {
    if (this.isProduction) {
      this.logger.warn({ to: message.to, subject: message.subject }, 'Email NOT sent: SMTP_URL is not configured');
      return;
    }
    this.logger.info({ to: message.to, subject: message.subject, text: message.text }, 'Email (development – not sent)');
  }
}

export function createMailer(config: { smtpUrl: string; from: string }, logger: Logger, isProduction: boolean): Mailer {
  return config.smtpUrl ? new SmtpMailer(config.smtpUrl, config.from) : new LogMailer(logger, isProduction);
}
