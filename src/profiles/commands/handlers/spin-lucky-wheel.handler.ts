import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SpinLuckyWheelCommand } from '../impl/spin-lucky-wheel.command';
import { PrismaService } from '../../../database/prisma.service';
import { QuestDbService } from '../../../database/questdb.service';
import { AppGateway } from '../../../websocket/app.gateway';
import { NotFoundException, BadRequestException } from '@nestjs/common';

@CommandHandler(SpinLuckyWheelCommand)
export class SpinLuckyWheelHandler implements ICommandHandler<SpinLuckyWheelCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly questDb: QuestDbService,
    private readonly appGateway: AppGateway,
  ) {}

  async execute(command: SpinLuckyWheelCommand) {
    const { userId, userName } = command;

    
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!profile) {
      throw new NotFoundException(`Profile not found for user ID: ${userId}`);
    }

    if (!profile.spin_tickets || profile.spin_tickets <= 0) {
      throw new BadRequestException('Bạn đã hết lượt quay!');
    }

    
    const prizes = await this.prisma.campaignPrize.findMany();
    if (prizes.length === 0) {
      throw new BadRequestException('Không tìm thấy cấu hình giải thưởng!');
    }

    
    let totalRate = prizes.reduce((sum, p) => sum + Number(p.drop_rate), 0);
    let rand = Math.random() * totalRate;
    let selectedPrize = prizes[0];

    let accum = 0;
    for (const prize of prizes) {
      accum += Number(prize.drop_rate);
      if (rand <= accum) {
        selectedPrize = prize;
        break;
      }
    }

    
    let updatedPoints = profile.points || 0;
    
    
    let pointsWon = 0;
    if (selectedPrize.prize_type === 'points') {
      const match = selectedPrize.prize_name.match(/\d+/);
      pointsWon = match ? parseInt(match[0], 10) : 0;
      updatedPoints += pointsWon;
    }

    await this.prisma.profile.update({
      where: { id: userId },
      data: {
        spin_tickets: profile.spin_tickets - 1,
        points: updatedPoints,
        last_lucky_spin: new Date(),
      },
    });

    
    if (selectedPrize.prize_type === 'voucher') {
      const voucherCode = `SPIN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await this.prisma.userVoucher.create({
        data: {
          user_id: userId,
          code: voucherCode,
          discount_amount: 50000, // 50k
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry
          status: 'active',
        },
      });
    }

    
    
    const userEscaped = userName.replace(/["\\]/g, '\\$&');
    const prizeEscaped = selectedPrize.prize_name.replace(/["\\]/g, '\\$&');
    
    
    const spinHistoryLine = `spin_history,user_id=${userId},prize_type=${selectedPrize.prize_type} user_name="${userEscaped}",prize_name="${prizeEscaped}"`;
    await this.questDb.ingestLine(spinHistoryLine);

    
    if (pointsWon > 0) {
      const pointsLine = `point_transactions,user_id=${userId},type=earn amount=${pointsWon}i,reason="Lucky Wheel Spin"`;
      await this.questDb.ingestLine(pointsLine);
    }

    
    this.appGateway.broadcastSpinWinner({ userName, prizeName: selectedPrize.prize_name });

    return {
      prize: {
        id: selectedPrize.id,
        prize_name: selectedPrize.prize_name,
        prize_type: selectedPrize.prize_type,
        prize_image: selectedPrize.prize_image,
      },
      spin_tickets: profile.spin_tickets - 1,
      points: updatedPoints,
    };
  }
}
