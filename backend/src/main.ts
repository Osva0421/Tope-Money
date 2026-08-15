import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors(); // Habilita las solicitudes desde tu frontend

  await app.listen(3000);
}
bootstrap();