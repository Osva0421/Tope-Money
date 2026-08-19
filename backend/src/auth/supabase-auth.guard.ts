import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../users/users.service';
import { AuthUser } from './auth-user';
import { IS_PUBLIC_KEY } from './public.decorator';
import { SupabaseAuthService } from './supabase-auth.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: SupabaseAuthService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      authUser?: AuthUser;
    }>();
    const authorization = request.headers.authorization;
    const [scheme, token] = authorization?.split(' ') ?? [];
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Inicia sesión para continuar');
    }

    const authUser = await this.authService.verifyAccessToken(token);
    if (!authUser) {
      throw new UnauthorizedException('La sesión no es válida o expiró');
    }

    await this.usersService.syncAuthenticatedUser(authUser);
    request.authUser = authUser;
    return true;
  }
}
