import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLeaderboardQuery } from '../impl/get-leaderboard.query';
import { PrismaService } from '../../../database/prisma.service';

@QueryHandler(GetLeaderboardQuery)
export class GetLeaderboardHandler implements IQueryHandler<GetLeaderboardQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetLeaderboardQuery) {
    const { gameName, limit = 10 } = query;

    const leaderboard = await this.prisma.gameLeaderboard.findMany({
      where: { game_name: gameName },
      orderBy: { score: 'desc' },
      take: limit,
      include: {
        profile: {
          select: {
            full_name: true,
          },
        },
      },
    });

    return leaderboard.map(entry => ({
      id: entry.id.toString(),
      user_id: entry.user_id,
      game_name: entry.game_name,
      score: entry.score,
      created_at: entry.created_at,
      full_name: entry.profile?.full_name || 'Người chơi ẩn danh',
    }));
  }
}
