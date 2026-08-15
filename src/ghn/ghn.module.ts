import { Module } from '@nestjs/common';
import { GhnController } from './ghn.controller';
import { GhnService } from './ghn.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [GhnController],
  providers: [GhnService],
  exports: [GhnService],
})
export class GhnModule {}
