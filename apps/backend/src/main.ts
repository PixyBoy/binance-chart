import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Global: every DTO-typed request body/query is validated and unknown
  // fields stripped, so a malformed request never reaches business logic.
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.enableCors({ origin: '*' });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
