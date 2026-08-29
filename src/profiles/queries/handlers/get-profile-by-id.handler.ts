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

    
    const profile = await this.prisma.profile.findUnique({
      where: { id },
      include: {
        vouchers: true,
        leaderboard: true,
      },
    });

    if (!profile) return null;

    
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(id)) {
      throw new Error('Invalid UUID format');
    }

    
    
    const pointTransactionsSql = `SELECT * FROM point_transactions WHERE user_id = '${id}' ORDER BY created_at DESC LIMIT 100`;
    const transactions = await this.questDb.querySql(pointTransactionsSql);

    return {
      ...profile,
      
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
