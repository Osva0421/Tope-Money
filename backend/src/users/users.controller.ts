import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users -> Lista a todos los usuarios
  @Get()
  getAllUsers() {
    return this.usersService.getAllUsers();
  }

  // POST /users -> Crea un usuario nuevo
  @Post()
  createUser(@Body() body: { email: string; name?: string }) {
    return this.usersService.createUser(body);
  }
}