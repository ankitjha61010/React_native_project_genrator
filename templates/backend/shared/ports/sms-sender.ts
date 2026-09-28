/** Sends SMS (one-time login codes). */
export interface SmsSender {
  /** `to` in E.164 format, e.g. "+919876543210". */
  send(to: string, text: string): Promise<void>;
}
