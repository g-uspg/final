import { Module } from '@nestjs/common';
import { QrAccessController } from './qr-access.controller';
import { QrAccessService } from './qr-access.service';

@Module({ controllers: [QrAccessController], providers: [QrAccessService], exports: [QrAccessService] })
export class QrAccessModule {}
