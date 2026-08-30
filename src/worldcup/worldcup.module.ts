import { Module } from '@nestjs/common';
import { WorldCupService } from './worldcup.service';
import { WorldCupController } from './worldcup.controller';
import { TicketsController } from './tickets.controller';

@Module({
  controllers: [WorldCupController, TicketsController],
  providers: [WorldCupService],
})
export class WorldCupModule {}
