import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProfileByIdQuery } from '../impl/get-profile-by-id.query';
import { PrismaService } from '../../../database/prisma.service';
import { QuestDbService } from '../../../database/questdb.service';

@QueryHandler(GetProfileByIdQuery)
export class GetProfileByIdHandler implements IQueryHandler<GetProfileByIdQuery> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly questDb: QuestDbService,
  ) {}

  async execute(query: GetProfileByIdQuery) {
    const { id } = query;

    // 1. Fetch profile from PostgreSQL (via Prisma)
    const profile = await this.prisma.profile.findUnique({
      where: { id },
      include: {
        vouchers: true,
        leaderboard: true,
      },
    });

    if (!profile) return null;

    // Validate UUID format to prevent SQL injection in custom SQL query
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(id)) {
      throw new Error('Invalid UUID format');
    }

    // 2. Fetch time-series point transactions from QuestDB
    // QuestDB SQL query
    const pointTransactionsSql = `SELECT * FROM point_transactions WHERE user_id = '${id}' ORDER BY created_at DESC LIMIT 100`;
    const transactions = await this.questDb.querySql(pointTransactionsSql);

    return {
      ...profile,
      // Map point transactions fetched from QuestDB
      transactions: transactions.map((t: any) => ({
        id: t.id ? t.id.toString() : undefined,
        user_id: t.user_id,
        amount: Number(t.amount),
        reason: t.reason,
        type: t.type,
        created_at: t.created_at,
      })),
    };
  }
}
