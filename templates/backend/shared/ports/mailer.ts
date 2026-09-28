export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Sends transactional email (verification and password reset codes). */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}
