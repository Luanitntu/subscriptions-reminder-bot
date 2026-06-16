import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    // Neon free tier auto-suspend → kết nối lạnh có thể fail (P1001).
    // Retry vài lần để DB kịp "thức dậy" thay vì để app crash khi bootstrap.
    const maxRetries = 10;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        if (attempt > 1) this.logger.log(`Database connected after ${attempt} attempt(s)`);
        return;
      } catch (err) {
        if (attempt === maxRetries) {
          this.logger.error(`Database connect failed after ${maxRetries} attempts: ${err}`);
          throw err;
        }
        this.logger.warn(`Database connect attempt ${attempt} failed, retrying in 3s...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
