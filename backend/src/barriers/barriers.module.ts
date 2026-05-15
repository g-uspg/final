import { Module } from '@nestjs/common';
import { BarriersController } from './barriers.controller';
import { BarriersService } from './barriers.service';

@Module({ controllers: [BarriersController], providers: [BarriersService], exports: [BarriersService] })
export class BarriersModule {}
