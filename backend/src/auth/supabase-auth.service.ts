import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthUser } from './auth-user';

@Injectable()
export class SupabaseAuthService {
  private readonly client: SupabaseClient | null;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    this.client =
      url && key
        ? createClient(url, key, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false,
            },
          })
        : null;
  }

  async verifyAccessToken(token: string): Promise<AuthUser | null> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Supabase Auth no está configurado en el backend',
      );
    }

    const { data, error } = await this.client.auth.getUser(token);
    if (error || !data.user?.email) return null;

    const metadataName = data.user.user_metadata?.name;
    return {
      id: data.user.id,
      email: data.user.email,
      name: typeof metadataName === 'string' ? metadataName : undefined,
    };
  }
}
