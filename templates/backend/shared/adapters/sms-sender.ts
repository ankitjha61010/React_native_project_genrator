import type { Logger } from '{{IMPORT:core.logger}}';
import type { SmsSender } from '{{IMPORT:port.smsSender}}';

interface TwilioConfig {
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFrom: string;
}

/** Sends SMS with Twilio's REST API (no SDK needed). */
export class TwilioSmsSender implements SmsSender {
  constructor(private readonly config: TwilioConfig) {}

  async send(to: string, text: string): Promise<void> {
    const { twilioAccountSid: sid, twilioAuthToken: token, twilioFrom: from } = this.config;
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: from, Body: text }),
    });
    if (!response.ok) throw new Error(`Twilio responded ${response.status}: ${await response.text()}`);
  }
}

/** Development: writes SMS (and their codes) to the log instead of sending them. */
export class LogSmsSender implements SmsSender {
  constructor(
    private readonly logger: Logger,
    private readonly isProduction: boolean,
  ) {}

  async send(to: string, text: string): Promise<void> {
    if (this.isProduction) {
      this.logger.warn({ to }, 'SMS NOT sent: Twilio is not configured');
      return;
    }
    this.logger.info({ to, text }, 'SMS (development – not sent)');
  }
}

export function createSmsSender(config: TwilioConfig, logger: Logger, isProduction: boolean): SmsSender {
  return config.twilioAccountSid ? new TwilioSmsSender(config) : new LogSmsSender(logger, isProduction);
}
