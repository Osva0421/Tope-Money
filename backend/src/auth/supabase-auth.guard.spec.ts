import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { SupabaseAuthService } from './supabase-auth.service';

describe('SupabaseAuthGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const auth = { verifyAccessToken: jest.fn() };
  const users = { syncAuthenticatedUser: jest.fn() };

  function context(authorization?: string) {
    const request = { headers: { authorization } };
    return {
      request,
      value: {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext,
    };
  }

  beforeEach(() => jest.clearAllMocks());

  it('rejects requests without a bearer token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const guard = new SupabaseAuthGuard(
      reflector as unknown as Reflector,
      auth as unknown as SupabaseAuthService,
      users as unknown as UsersService,
    );

    await expect(guard.canActivate(context().value)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches the verified user and synchronizes its profile', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    auth.verifyAccessToken.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
    });
    const testContext = context('Bearer valid-token');
    const guard = new SupabaseAuthGuard(
      reflector as unknown as Reflector,
      auth as unknown as SupabaseAuthService,
      users as unknown as UsersService,
    );

    await expect(guard.canActivate(testContext.value)).resolves.toBe(true);
    expect(testContext.request).toHaveProperty('authUser.id', 'user-1');
    expect(users.syncAuthenticatedUser).toHaveBeenCalled();
  });
});
