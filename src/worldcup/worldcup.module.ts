import { Module } from '@nestjs/common';
import { WorldCupService } from './worldcup.service';
import { WorldCupController } from './worldcup.controller';

@Module({
  controllers: [WorldCupController],
  providers: [WorldCupService],
})
export class WorldCupModule {}
