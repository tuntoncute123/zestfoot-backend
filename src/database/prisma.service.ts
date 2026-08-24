import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    
    // Danh sách các câu lệnh ALTER TABLE riêng biệt (PostgreSQL prepared statement yêu cầu thực thi từng lệnh một)
    const migrationStatements = [
      `ALTER TABLE IF EXISTS orders 
        ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(100),
        ADD COLUMN IF NOT EXISTS carrier VARCHAR(50),
        ADD COLUMN IF NOT EXISTS shipping_timeline JSONB,
        ADD COLUMN IF NOT EXISTS voucher_discount DECIMAL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS voucher_code VARCHAR(100),
        ADD COLUMN IF NOT EXISTS point_discount DECIMAL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
        ADD COLUMN IF NOT EXISTS payment_info JSONB,
        ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL,
        ADD COLUMN IF NOT EXISTS sub_total DECIMAL,
        ADD COLUMN IF NOT EXISTS discount DECIMAL,
        ADD COLUMN IF NOT EXISTS total_amount DECIMAL,
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'`,

      `ALTER TABLE IF EXISTS reviews 
        ADD COLUMN IF NOT EXISTS media_urls JSONB,
        ADD COLUMN IF NOT EXISTS rewarded_points BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS sentiment_score DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS sentiment_explanation TEXT,
        ADD COLUMN IF NOT EXISTS sentiment TEXT`,

      `ALTER TABLE IF EXISTS products 
        ADD COLUMN IF NOT EXISTS costPrice BIGINT,
        ADD COLUMN IF NOT EXISTS salePrice BIGINT,
        ADD COLUMN IF NOT EXISTS isNew BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS isSale BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS isTrending BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS isAsicsExclusive BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS viewsCount INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS category VARCHAR(100),
        ADD COLUMN IF NOT EXISTS subCategory VARCHAR(100),
        ADD COLUMN IF NOT EXISTS gender VARCHAR(50),
        ADD COLUMN IF NOT EXISTS badges JSONB`,

      `ALTER TABLE IF EXISTS profiles 
        ADD COLUMN IF NOT EXISTS points INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tier VARCHAR(50) DEFAULT 'Silver',
        ADD COLUMN IF NOT EXISTS totalSpent DECIMAL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_lucky_spin TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS spin_tickets INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`
    ];

    for (const sql of migrationStatements) {
      try {
        await this.$executeRawUnsafe(sql);
      } catch (e: any) {
        this.logger.warn(`Auto-migration note: ${e.message}`);
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
