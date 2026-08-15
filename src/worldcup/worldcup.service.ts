import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AppGateway } from '../websocket/app.gateway';
import { serializeData } from '../common/utils/db-serialization';
import { COUNTRIES, getVoucherDiscountAmount } from './helpers/worldcup.helper';

@Injectable()
export class WorldCupService {
  private readonly logger = new Logger(WorldCupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appGateway: AppGateway,
  ) {}



  async getPrizesAndHistory() {
    try {
      // 1. Fetch prizes stock
      const prizes = await this.prisma.campaignPrize.findMany({
        orderBy: { id: 'asc' },
      });

      // 2. Fetch recent spin logs
      const history = await this.prisma.spinHistory.findMany({
        orderBy: { created_at: 'desc' },
        take: 20,
      });

      // 3. Fetch winners (only actual prizes, not 'nothing')
      const winners = await this.prisma.spinHistory.findMany({
        where: {
          prize_type: {
            notIn: ['nothing', 'badge_national'],
          },
        },
        orderBy: { created_at: 'desc' },
        take: 15,
      });

      // 4. Calculate unique badges leaderboard
      const userBadges = await this.prisma.userBadge.findMany({
        where: { quantity: { gte: 1 } },
      });
      const profiles = await this.prisma.profile.findMany({
        select: { id: true, full_name: true },
      });
      const profileMap = new Map(profiles.map(p => [p.id, p.full_name]));

      const userBadgeCounts: Record<string, number> = {};
      for (const ub of userBadges) {
        userBadgeCounts[ub.user_id] = (userBadgeCounts[ub.user_id] || 0) + 1;
      }

      const leaderboard = Object.entries(userBadgeCounts)
        .map(([userId, count]) => ({
          user_id: userId,
          user_name: profileMap.get(userId) || 'Người chơi ẩn danh',
          unique_badges: count,
        }))
        .sort((a, b) => b.unique_badges - a.unique_badges)
        .slice(0, 10);

      return {
        prizes: serializeData(prizes),
        history: serializeData(history),
        winners: serializeData(winners),
        leaderboard: serializeData(leaderboard),
      };
    } catch (error) {
      this.logger.error(`Lỗi khi lấy thông tin giải thưởng & lịch sử World Cup: ${error.message}`, error.stack);
      throw error;
    }
  }

  async verifyToken(token: string) {
    try {
      const ticket = await this.prisma.qrTicket.findUnique({
        where: { id: token },
      });

      if (!ticket) {
        return { valid: false, message: 'Mã vé không tồn tại hoặc đã bị xóa.' };
      }

      if (ticket.is_used) {
        return { valid: false, message: 'Mã vé này đã được sử dụng sút phạt trước đó.' };
      }

      if (ticket.expired_at && new Date(ticket.expired_at) < new Date()) {
        return { valid: false, message: 'Mã vé của bạn đã hết hạn sử dụng.' };
      }

      return {
        valid: true,
        ticket: serializeData(ticket),
      };
    } catch (error) {
      this.logger.error(`Lỗi khi kiểm tra mã vé World Cup (Token: ${token}): ${error.message}`, error.stack);
      throw error;
    }
  }

  async spin(token: string, userId: string) {
    try {
      // 1. Verify user profile exists
      const profile = await this.prisma.profile.findUnique({
        where: { id: userId },
      });
      if (!profile) {
        throw new NotFoundException('Tài khoản người dùng không tồn tại.');
      }

      // 2. Verify ticket validity
      const ticketCheck = await this.verifyToken(token);
      if (!ticketCheck.valid) {
        throw new BadRequestException(ticketCheck.message);
      }

      // Run transaction to select prize, decrease stock, consume ticket, and log history
      const result = await this.prisma.$transaction(async (tx) => {
        // Re-verify ticket inside transaction to prevent double spending
        const ticket = await tx.qrTicket.findUnique({
          where: { id: token },
        });
        if (!ticket || ticket.is_used) {
          throw new BadRequestException('Mã vé đã được sử dụng ở tiến trình khác.');
        }

        // Fetch prizes
        const dbPrizes = await tx.campaignPrize.findMany();
        if (dbPrizes.length === 0) {
          throw new BadRequestException('Cơ cấu giải thưởng World Cup chưa được thiết lập.');
        }

        // 3. Roll drop rate probability
        const roll = Math.random();
        let cumulativeSum = 0;
        let selectedPrize = null;

        for (const p of dbPrizes) {
          cumulativeSum += Number(p.drop_rate);
          if (roll <= cumulativeSum) {
            selectedPrize = p;
            break;
          }
        }

        // Default to "nothing" if sum wasn't enough or none selected
        if (!selectedPrize) {
          selectedPrize = dbPrizes.find(p => p.prize_type === 'nothing') || dbPrizes[dbPrizes.length - 1];
        }

        // 4. Handle limited stock falling back to "nothing"
        const isLimitedStock = selectedPrize.prize_type !== 'nothing';
        if (isLimitedStock && selectedPrize.remaining_quantity <= 0) {
          selectedPrize = dbPrizes.find(p => p.prize_type === 'nothing') || {
            prize_type: 'nothing',
            prize_name: 'Chúc bạn may mắn lần sau',
          };
        }

        // 5. Consume ticket
        await tx.qrTicket.update({
          where: { id: token },
          data: {
            is_used: true,
            used_at: new Date(),
            user_id: userId,
          },
        });

        const isGoal = selectedPrize.prize_type !== 'nothing';

        if (isGoal) {
          // Decrease remaining stock
          await tx.campaignPrize.update({
            where: { id: selectedPrize.id },
            data: {
              remaining_quantity: { decrement: 1 },
            },
          });

          // Award prize type
          if (selectedPrize.prize_type.startsWith('voucher_') || selectedPrize.prize_type === 'voucher') {
            // Generate code
            const randSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
            const code = `WC2026-${randSuffix}`;
            
            const amount = getVoucherDiscountAmount(selectedPrize.prize_type);

            // Insert user voucher
            await tx.userVoucher.create({
              data: {
                user_id: userId,
                code,
                discount_amount: amount,
                min_order_value: 0,
                status: 'active',
              },
            });
          }

          // Write SpinHistory
          const historyRecord = await tx.spinHistory.create({
            data: {
              user_id: userId,
              user_name: profile.full_name || 'Khách hàng',
              prize_name: selectedPrize.prize_name,
              prize_type: selectedPrize.prize_type,
            },
          });

          return {
            isGoal: true,
            prize: {
              prize_type: selectedPrize.prize_type,
              prize_name: selectedPrize.prize_name,
            },
            bonusBadge: null,
            historyRecord,
          };
        } else {
          // Consulate prize: Random National Badge
          const randomCountry = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
          
          // Award badge to user
          await tx.userBadge.upsert({
            where: {
              user_id_badge_type: {
                user_id: userId,
                badge_type: randomCountry.code,
              },
            },
            update: {
              quantity: { increment: 1 },
            },
            create: {
              user_id: userId,
              badge_type: randomCountry.code,
              quantity: 1,
            },
          });

          // Write SpinHistory
          const historyRecord = await tx.spinHistory.create({
            data: {
              user_id: userId,
              user_name: profile.full_name || 'Khách hàng',
              prize_name: `Huy hiệu ${randomCountry.name}`,
              prize_type: 'badge_national',
            },
          });

          return {
            isGoal: false,
            prize: {
              prize_type: 'nothing',
              prize_name: 'Chúc bạn may mắn lần sau',
            },
            bonusBadge: randomCountry.code,
            historyRecord,
          };
        }
      });

      // 6. Broadcast winner to all WebSocket clients (non-blocking)
      try {
        const winnerName = profile.full_name || 'Khách hàng';
        const prizeDesc = result.isGoal ? result.prize.prize_name : `Huy hiệu ${COUNTRIES.find(c => c.code === result.bonusBadge)?.name}`;
        this.appGateway.broadcastSpinWinner({
          userName: winnerName,
          prizeName: prizeDesc,
        });
      } catch (wsErr) {
        this.logger.error('Lỗi phát sóng WebSocket winner:', wsErr);
      }

      return {
        prize: result.prize,
        bonusBadge: result.bonusBadge,
      };
    } catch (error) {
      this.logger.error(`Lỗi khi thực hiện sút World Cup (User: ${userId}, Token: ${token}): ${error.message}`, error.stack);
      throw error;
    }
  }

  async claimShoe(userId: string, size: number, fullName: string, phone: string, address: string) {
    try {
      const profile = await this.prisma.profile.findUnique({
        where: { id: userId },
      });
      if (!profile) {
        throw new NotFoundException('Tài khoản người dùng không tồn tại.');
      }

      // Verify user collects all 48 unique badges
      const badgeCount = await this.prisma.userBadge.count({
        where: {
          user_id: userId,
          quantity: { gte: 1 },
        },
      });

      if (badgeCount < 48) {
        throw new BadRequestException('Bạn cần thu thập đủ 48 huy hiệu quốc gia mới có thể đổi thưởng giày!');
      }

      // Verify user hasn't claimed yet
      const existingClaim = await this.prisma.userBadgeClaim.findFirst({
        where: { user_id: userId },
      });

      if (existingClaim) {
        throw new BadRequestException('Tài khoản của bạn đã thực hiện đổi thưởng giày World Cup trước đây.');
      }

      const orderResult = await this.prisma.$transaction(async (tx) => {
        // Create free Order
        const newOrder = await tx.order.create({
          data: {
            customer: {
              id: userId,
              name: fullName,
              phone,
              address,
            },
            items: [
              {
                product_id: 'worldcup-shoe-reward',
                name: 'Giày ZestFoot Ltd Ed World Cup 2026',
                price: 0,
                quantity: 1,
                size,
              },
            ],
            sub_total: 0,
            shipping_fee: 0,
            total_amount: 0,
            status: 'pending',
            payment_method: 'World Cup Reward',
          },
        });

        // Create Badge Claim record
        await tx.userBadgeClaim.create({
          data: {
            user_id: userId,
            shoe_size: size,
            order_id: newOrder.id.toString(),
          },
        });

        return newOrder;
      });

      return {
        success: true,
        orderId: orderResult.id.toString(),
      };
    } catch (error) {
      this.logger.error(`Lỗi khi yêu cầu đổi thưởng giày World Cup (User: ${userId}): ${error.message}`, error.stack);
      throw error;
    }
  }
}
