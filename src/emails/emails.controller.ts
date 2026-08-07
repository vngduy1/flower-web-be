import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { RoleCode } from '../auth/enums/role-code.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { SendTestEmailDto } from './dto/send-test-email.dto';
import { EmailsService } from './emails.service';

@Controller('admin/emails')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.ADMIN)
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  @Post('verify')
  async verify() {
    const connected = await this.emailsService.verifyConnection();

    return {
      connected,
    };
  }

  @Post('test')
  async sendTest(@Body() dto: SendTestEmailDto) {
    const sent = await this.emailsService.sendRegistrationEmail({
      to: dto.to,
      fullName: dto.fullName,
    });

    return {
      sent,
    };
  }
}
