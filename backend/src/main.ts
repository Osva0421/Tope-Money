import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(json({ limit: '8mb' }));
  app.enableCors(); // Habilita las solicitudes desde tu frontend

  await app.listen(3000);
}
bootstrap();
