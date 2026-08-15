import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { QuestDbService } from './questdb.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [PrismaService, QuestDbService],
  exports: [PrismaService, QuestDbService],
})
export class DatabaseModule {}
