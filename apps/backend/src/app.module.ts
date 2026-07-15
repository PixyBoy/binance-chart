import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { ConfigModule } from './common/config/config.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { RedisModule } from './common/redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    RedisModule,
    EventEmitterModule.forRoot(),
    IngestionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
