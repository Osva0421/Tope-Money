import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  // Inyectamos nuestra conexión a la base de datos
  constructor(private prisma: PrismaService) {}

  // Creamos nuestro primer método para interactuar con la tabla de usuarios
  async getAllUsers() {
    return this.prisma.user.findMany();
  }

  //Se crea un nuevo usuario
  async createUser(data: { email: string; name?: string }) {
    return this.prisma.user.create({
        data,
    });
  }
}