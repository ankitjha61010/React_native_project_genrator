export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Sends transactional email (verification, password reset…). */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}
