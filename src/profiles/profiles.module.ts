import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ProfilesController } from './profiles.controller';
import { UsersController } from './users.controller';
import { PointsController } from './points.controller';
import { VouchersController } from './vouchers.controller';
import { GamesController } from './games.controller';
import { GetProfileByIdHandler } from './queries/handlers/get-profile-by-id.handler';
import { GetLeaderboardHandler } from './queries/handlers/get-leaderboard.handler';
import { SpinLuckyWheelHandler } from './commands/handlers/spin-lucky-wheel.handler';
import { AddPointsHandler } from './commands/handlers/add-points.handler';

import { ProfilesService } from './profiles.service';

export const QueryHandlers = [
  GetProfileByIdHandler,
  GetLeaderboardHandler,
];

export const CommandHandlers = [
  SpinLuckyWheelHandler,
  AddPointsHandler,
];

@Module({
  imports: [CqrsModule],
  controllers: [ProfilesController, UsersController, PointsController, VouchersController, GamesController],
  providers: [
    ProfilesService,
    ...QueryHandlers,
    ...CommandHandlers,
  ],
  exports: [ProfilesService],
})
export class ProfilesModule {}
