import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [PrismaModule, UserModule, CategoriesModule, TransactionsModule],
  controllers: [AppController, UsersController],
  providers: [AppService, PrismaService, UsersService],
})
export class AppModule {}
