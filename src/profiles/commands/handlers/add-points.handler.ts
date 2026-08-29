import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AddPointsCommand } from '../impl/add-points.command';
import { PrismaService } from '../../../database/prisma.service';
import { QuestDbService } from '../../../database/questdb.service';
import { NotFoundException } from '@nestjs/common';

@CommandHandler(AddPointsCommand)
export class AddPointsHandler implements ICommandHandler<AddPointsCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly questDb: QuestDbService,
  ) {}

  async execute(command: AddPointsCommand) {
    const { userId, amount, reason, type } = command;

    
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!profile) {
      throw new NotFoundException(`Profile not found for user ID: ${userId}`);
    }

    
    let newPoints = profile.points || 0;
    if (type === 'earn') {
      newPoints += amount;
    } else {
      newPoints = Math.max(0, newPoints - amount);
    }

    
    const updatedProfile = await this.prisma.profile.update({
      where: { id: userId },
      data: {
        points: newPoints,
      },
    });

    
    const reasonEscaped = reason.replace(/["\\]/g, '\\$&');
    const pointsLine = `point_transactions,user_id=${userId},type=${type} amount=${amount}i,reason="${reasonEscaped}"`;
    await this.questDb.ingestLine(pointsLine);

    return {
      userId: updatedProfile.id,
      points: updatedProfile.points,
      amount,
      type,
    };
  }
}
