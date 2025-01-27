import { Module } from '@nestjs/common';
import { SendOtpController } from './sendOtp.controller';
import Mailer from 'src/common/mailer';
import { OtpModule } from '../otp/otp.module';
import { MailerModule } from '../mailer/mailer.module';
import { SendOtpService } from './sendOtp.service';

@Module({
  imports: [OtpModule, MailerModule],
  controllers: [SendOtpController],
  providers: [Mailer, SendOtpService],
  exports: [],
})
export class SendOtpModule {}
