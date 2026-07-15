import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global module: PrismaService is needed by almost every feature module
 * (ingestion, aggregation, streaming, history API), so it is registered
 * once here instead of re-imported everywhere.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
