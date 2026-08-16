import { Module } from '@nestjs/common';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [PrismaModule, CategoriesModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UserModule {}
