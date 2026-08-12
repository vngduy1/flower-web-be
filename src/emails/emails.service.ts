import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

import { SendEmailOptions } from './interfaces/send-email-options.interface';

@Injectable()
export class EmailsService implements OnModuleInit {
  private readonly logger = new Logger(EmailsService.name);

  private transporter!: Transporter<SMTPTransport.SentMessageInfo>;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const host = this.configService.get<string>('MAIL_HOST');

    const port = this.configService.get<number>('MAIL_PORT', 1025);

    const secure =
      this.configService.get<string>('MAIL_SECURE', 'false') === 'true';

    const user = this.configService.get<string>('MAIL_USER');

    const password = this.configService.get<string>('MAIL_PASSWORD');

    if (!host) {
      this.logger.warn(
        'MAIL_HOST chưa được cấu hình. Email sẽ không được gửi.',
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,

      auth:
        user && password
          ? {
              user,
              pass: password,
            }
          : undefined,
    });
  }

  /**
   * Gửi email cơ bản.
   *
   * Không throw lỗi ra ngoài nghiệp vụ chính:
   * Order hoặc Payment không nên rollback chỉ vì SMTP lỗi.
   */
  async send(options: SendEmailOptions): Promise<boolean> {
    const recipients = this.formatRecipients(options.to);
    const enabled =
      this.configService.get<string>('MAIL_ENABLED', 'false') === 'true';

    if (!enabled) {
      this.logger.debug(`Email disabled: ${options.subject} -> ${recipients}`);

      return false;
    }

    const host = this.configService.get<string>('MAIL_HOST');

    if (!host) {
      this.logger.warn(
        `Không gửi email vì MAIL_HOST chưa được cấu hình: ${recipients}`,
      );

      return false;
    }

    const fromAddress = this.configService.get<string>(
      'MAIL_FROM_ADDRESS',
      'no-reply@flower-shop.local',
    );

    const fromName = this.configService.get<string>(
      'MAIL_FROM_NAME',
      'Flower Shop',
    );

    try {
      const result = await this.transporter.sendMail({
        from: {
          name: fromName,
          address: fromAddress,
        },
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text ?? this.stripHtml(options.html),
      });

      this.logger.log(
        `Email sent: messageId=${result.messageId}, to=${recipients}, reference=${options.referenceType ?? '-'}:${options.referenceId ?? '-'}`,
      );

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Email send failed: to=${recipients}, subject=${options.subject}, error=${message}`,
      );

      return false;
    }
  }

  private formatRecipients(recipients: string | string[]): string {
    return Array.isArray(recipients) ? recipients.join(', ') : recipients;
  }

  /**
   * Kiểm tra kết nối SMTP.
   *
   * Dùng khi khởi động hoặc test thủ công.
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();

      this.logger.log('SMTP connection verified successfully');

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(`SMTP connection verification failed: ${message}`);

      return false;
    }
  }

  /**
   * Email đăng ký tài khoản.
   */
  async sendRegistrationEmail(params: {
    to: string;
    fullName: string;
  }): Promise<boolean> {
    return this.send({
      to: params.to,
      subject: 'Đăng ký tài khoản thành công',
      text:
        `Xin chào ${params.fullName}, ` +
        'tài khoản Flower Shop của bạn đã được tạo thành công.',
      html: this.buildLayout({
        title: 'Đăng ký tài khoản thành công',
        content: `
          <p>Xin chào <strong>${this.escapeHtml(params.fullName)}</strong>,</p>

          <p>
            Tài khoản Flower Shop của bạn đã được
            tạo thành công.
          </p>

          <p>
            Bạn có thể đăng nhập và bắt đầu mua hoa.
          </p>
        `,
      }),
      referenceType: 'USER',
    });
  }

  /**
   * Email tạo đơn hàng.
   */
  async sendOrderCreatedEmail(params: {
    to: string;
    fullName: string;
    orderId: string;
    orderNumber: string;
    totalAmount: number;
    currencyCode: string;
    deliveryDate: string;
  }): Promise<boolean> {
    return this.send({
      to: params.to,
      subject: `Đã tiếp nhận đơn hàng ${params.orderNumber}`,
      text:
        `Đơn hàng ${params.orderNumber} đã được tạo. ` +
        `Tổng tiền: ${params.totalAmount} ${params.currencyCode}.`,
      html: this.buildLayout({
        title: 'Đặt hàng thành công',
        content: `
          <p>Xin chào <strong>${this.escapeHtml(params.fullName)}</strong>,</p>

          <p>
            Chúng tôi đã tiếp nhận đơn hàng
            <strong>${this.escapeHtml(params.orderNumber)}</strong>.
          </p>

          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:8px;border-bottom:1px solid #ddd">
                Mã đơn hàng
              </td>
              <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">
                ${this.escapeHtml(params.orderNumber)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px;border-bottom:1px solid #ddd">
                Ngày giao hàng
              </td>
              <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">
                ${this.escapeHtml(params.deliveryDate)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px">
                Tổng tiền
              </td>
              <td style="padding:8px;text-align:right">
                <strong>
                  ${this.formatMoney(params.totalAmount, params.currencyCode)}
                </strong>
              </td>
            </tr>
          </table>
        `,
      }),
      referenceType: 'ORDER',
      referenceId: params.orderId,
    });
  }

  /**
   * Email thanh toán thành công.
   */
  async sendPaymentSuccessEmail(params: {
    to: string;
    fullName: string;
    orderId: string;
    orderNumber: string;
    amount: number;
    currencyCode: string;
  }): Promise<boolean> {
    return this.send({
      to: params.to,
      subject: `Thanh toán thành công - ${params.orderNumber}`,
      text: `Đơn hàng ${params.orderNumber} đã được thanh toán thành công.`,
      html: this.buildLayout({
        title: 'Thanh toán thành công',
        content: `
          <p>Xin chào <strong>${this.escapeHtml(params.fullName)}</strong>,</p>

          <p>
            Thanh toán cho đơn hàng
            <strong>${this.escapeHtml(params.orderNumber)}</strong>
            đã thành công.
          </p>

          <p>
            Số tiền:
            <strong>
              ${this.formatMoney(params.amount, params.currencyCode)}
            </strong>
          </p>
        `,
      }),
      referenceType: 'ORDER',
      referenceId: params.orderId,
    });
  }

  /**
   * Email đổi trạng thái đơn hàng.
   */
  async sendOrderStatusChangedEmail(params: {
    to: string;
    fullName: string;
    orderId: string;
    orderNumber: string;
    statusLabel: string;
    message: string;
  }): Promise<boolean> {
    return this.send({
      to: params.to,
      subject: `${params.statusLabel} - ${params.orderNumber}`,
      text: params.message,
      html: this.buildLayout({
        title: params.statusLabel,
        content: `
          <p>Xin chào <strong>${this.escapeHtml(params.fullName)}</strong>,</p>

          <p>
            Đơn hàng
            <strong>${this.escapeHtml(params.orderNumber)}</strong>
            đã được cập nhật.
          </p>

          <p>${this.escapeHtml(params.message)}</p>
        `,
      }),
      referenceType: 'ORDER',
      referenceId: params.orderId,
    });
  }

  private buildLayout(params: { title: string; content: string }): string {
    const title = this.escapeHtml(params.title);

    return `
      <!doctype html>
      <html lang="vi">
        <head>
          <meta charset="utf-8">
          <meta name="viewport"
                content="width=device-width,initial-scale=1">
          <title>${title}</title>
        </head>

        <body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#222">
          <div style="max-width:640px;margin:0 auto;padding:24px">
            <div style="background:#ffffff;border-radius:8px;padding:28px">
              <h1 style="font-size:22px;margin:0 0 20px">
                ${title}
              </h1>

              ${params.content}

              <hr style="border:0;border-top:1px solid #eee;margin:28px 0">

              <p style="font-size:12px;color:#777;margin:0">
                Email này được gửi tự động từ Flower Shop.
                Vui lòng không trả lời email này.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private formatMoney(amount: number, currencyCode: string): string {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
    }).format(amount);
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
