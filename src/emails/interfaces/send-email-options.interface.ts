import type { Attachment } from 'nodemailer/lib/mailer';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;

  replyTo?: string;
  attachments?: Attachment[];

  referenceType?: string;
  referenceId?: string;
}
