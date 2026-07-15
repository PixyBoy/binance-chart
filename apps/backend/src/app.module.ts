import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { ConfigModule } from './common/config/config.module';
import { IngestionModule } from './ingestion/ingestion.module';

@Module({
  imports: [PrismaModule, ConfigModule, IngestionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
