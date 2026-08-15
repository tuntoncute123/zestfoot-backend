import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GetProfileByIdQuery } from './queries/impl/get-profile-by-id.query';
import { GetLeaderboardQuery } from './queries/impl/get-leaderboard.query';
import { AddPointsCommand } from './commands/impl/add-points.command';
import { SpinLuckyWheelCommand } from './commands/impl/spin-lucky-wheel.command';
import { AddPointsDto } from './dto/add-points.dto';
import { PrismaService } from '../database/prisma.service';
import { mapProfileFields, mapTransactionFields, mapVoucherFields } from '../common/utils/mapping';
import { AppGateway } from '../websocket/app.gateway';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
    private readonly appGateway: AppGateway,
  ) {}

  async getProfile(id: string) {
    try {
      const profile = await this.queryBus.execute(new GetProfileByIdQuery(id));
      if (!profile) {
        throw new NotFoundException(`Profile with ID ${id} not found`);
      }
      
      const mapped = mapProfileFields(profile);
      if (profile.transactions) {
        mapped.transactions = profile.transactions.map(mapTransactionFields);
      }
      if (profile.vouchers) {
        mapped.vouchers = profile.vouchers.map(mapVoucherFields);
      }
      return mapped;
    } catch (error) {
      this.logger.error(`Lỗi khi lấy thông tin profile (ID ${id}): ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateProfile(id: string, data: any) {
    try {
      const updateData: any = {};
      if (data.lastLuckySpin !== undefined) {
        updateData.last_lucky_spin = data.lastLuckySpin ? new Date(data.lastLuckySpin) : null;
      }
      if (data.spinTickets !== undefined) {
        updateData.spin_tickets = data.spinTickets;
      }
      if (data.points !== undefined) {
        updateData.points = data.points;
      }
      if (data.fullName !== undefined) {
        updateData.full_name = data.fullName;
      }
      if (data.email !== undefined) {
        updateData.email = data.email;
      }

      // Check fields matching snake_case as well just in case
      if (data.last_lucky_spin !== undefined) {
        updateData.last_lucky_spin = data.last_lucky_spin ? new Date(data.last_lucky_spin) : null;
      }
      if (data.spin_tickets !== undefined) {
        updateData.spin_tickets = data.spin_tickets;
      }
      if (data.full_name !== undefined) {
        updateData.full_name = data.full_name;
      }

      const updated = await this.prisma.profile.update({
        where: { id },
        data: updateData,
        include: {
          vouchers: true,
          leaderboard: true,
        },
      });

      return mapProfileFields(updated);
    } catch (error) {
      this.logger.error(`Lỗi khi cập nhật profile (ID ${id}): ${error.message}`, error.stack);
      throw error;
    }
  }

  async addPoints(id: string, dto: AddPointsDto) {
    try {
      return await this.commandBus.execute(new AddPointsCommand(id, dto.amount, dto.reason, dto.type));
    } catch (error) {
      this.logger.error(`Lỗi khi cộng/trừ điểm thưởng cho profile (ID ${id}): ${error.message}`, error.stack);
      throw error;
    }
  }

  async spinLuckyWheel(id: string, userName: string) {
    try {
      return await this.commandBus.execute(new SpinLuckyWheelCommand(id, userName));
    } catch (error) {
      this.logger.error(`Lỗi khi thực hiện quay vòng quay may mắn (ID ${id}): ${error.message}`, error.stack);
      throw error;
    }
  }

  async getLeaderboard(gameName: string, limit?: number) {
    try {
      return await this.queryBus.execute(new GetLeaderboardQuery(gameName, limit));
    } catch (error) {
      this.logger.error(`Lỗi khi lấy BXH game ${gameName}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async saveScore(userId: string, gameName: string, score: number) {
    try {
      // Validate that userId is a profile
      const profile = await this.prisma.profile.findUnique({
        where: { id: userId },
      });
      if (!profile) {
        throw new NotFoundException(`Profile with user ID: ${userId} not found`);
      }

      // Check if user has an existing score for this game
      const existing = await this.prisma.gameLeaderboard.findFirst({
        where: {
          user_id: userId,
          game_name: gameName,
        },
      });

      let record;
      if (existing) {
        if (score > existing.score) {
          record = await this.prisma.gameLeaderboard.update({
            where: { id: existing.id },
            data: { score },
          });
        } else {
          record = existing;
        }
      } else {
        record = await this.prisma.gameLeaderboard.create({
          data: {
            user_id: userId,
            game_name: gameName,
            score,
          },
        });
      }

      // Fetch the updated leaderboard for the game
      const updatedLeaderboard = await this.getLeaderboard(gameName);

      // Broadcast the real-time update via WebSocket
      this.appGateway.broadcastLeaderboardUpdate(gameName, updatedLeaderboard);

      return record;
    } catch (error) {
      this.logger.error(`Lỗi khi lưu điểm game ${gameName} cho user ID ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getProfiles(search?: string, page: number = 1, size: number = 10) {
    try {
      const skip = (page - 1) * size;
      const take = Number(size);

      const where: any = {};
      if (search && search.trim() !== '') {
        const query = search.trim();
        where.OR = [
          {
            email: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            full_name: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ];
      }

      const [profiles, total] = await Promise.all([
        this.prisma.profile.findMany({
          where,
          skip,
          take,
          orderBy: { updated_at: 'desc' },
        }),
        this.prisma.profile.count({ where }),
      ]);

      return {
        data: profiles.map(mapProfileFields),
        total,
      };
    } catch (error) {
      this.logger.error(`Lỗi khi lấy danh sách profile: ${error.message}`, error.stack);
      throw error;
    }
  }
}
