declare module 'zeptomail' {
  export interface SendMailClientConfig {
    url: string;
    token: string;
  }

  export interface EmailAddress {
    address: string;
    name: string;
  }

  export interface EmailRecipient {
    email_address: EmailAddress;
  }

  export interface MailData {
    from: EmailAddress;
    to: EmailRecipient[];
    subject: string;
    htmlbody?: string;
    textbody?: string;
  }

  export class SendMailClient {
    constructor(config: SendMailClientConfig);
    sendMail(mailData: MailData): Promise<any>;
  }
}
