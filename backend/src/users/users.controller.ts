import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUserId } from '../auth/auth-user';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile(@CurrentUserId() userId: string) {
    return this.usersService.getProfile(userId);
  }
}
