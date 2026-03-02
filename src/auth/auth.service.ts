import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwksClient } from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwksClient: JwksClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const jwksUrl = this.config.getOrThrow<string>('SUPABASE_JWKS_URL');
    this.jwksClient = new JwksClient({ jwksUri: jwksUrl, cache: true });
  }

  /**
   * Verifies a Supabase access_token, upserts the profile, and returns
   * the profile with roles.
   */
  async createSession(accessToken: string) {
    let userId: string;
    let email: string;
    let meta: Record<string, string> = {};

    try {
      const payload = await this.verifyToken(accessToken);
      userId = payload.sub as string;
      email = payload.email as string;
      meta = (payload['user_metadata'] as Record<string, string>) ?? {};
    } catch {
      throw new UnauthorizedException('Invalid Supabase token');
    }

    const fullName: string | undefined =
      meta['full_name'] ?? meta['name'] ?? undefined;
    const photoURL: string | undefined = meta['avatar_url'] ?? undefined;

    // 1. Check if user already has a profile
    let profile = await this.prisma.profile.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });

    // 2. Handle New User Flow (No profile yet)
    if (!profile) {
      const invitation = await this.prisma.userInvitation.findUnique({
        where: { email },
      });

      if (!invitation) {
        // CRITICAL: Delete from auth.users OUTSIDE transaction so it persists even if we throw
        await this.prisma
          .$executeRaw`DELETE FROM auth.users WHERE id=${userId}::uuid`;
        throw new UnauthorizedException(
          'No account found for this email. Please contact an administrator.',
        );
      }

      const role = await this.prisma.role.findUnique({
        where: { key: invitation.roleKey },
      });

      if (!role) {
        throw new UnauthorizedException(
          'Assigned role not found. Please contact an administrator.',
        );
      }

      // Now use a transaction for the registration process (Profile + Role + Invitation cleanup)
      profile = await this.prisma.$transaction(async (tx) => {
        await tx.profile.create({
          data: {
            id: userId,
            full_name: fullName ?? null,
            email,
            photoURL,
          },
        });

        await tx.userRole.create({
          data: { userId, roleId: role.id },
        });

        await tx.userInvitation.delete({ where: { email } });

        return tx.profile.findUnique({
          where: { id: userId },
          include: { userRoles: { include: { role: true } } },
        }) as any;
      });
    } else {
      // 3. Handle Existing User Flow (Update metadata)
      profile = await this.prisma.profile.update({
        where: { id: userId },
        data: {
          full_name: fullName,
          photoURL,
          email,
        },
        include: { userRoles: { include: { role: true } } },
      });
    }

    // 4. Final safety check: User MUST have at least one role
    if (!profile || profile.userRoles.length === 0) {
      this.logger.error(`User ${email} (${userId}) has profile but no roles.`);
      throw new UnauthorizedException(
        'Your account has no defined roles. Please contact an administrator.',
      );
    }

    return this.formatProfile(profile);
  }

  private verifyToken(token: string): Promise<jwt.JwtPayload> {
    return new Promise((resolve, reject) => {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        return reject(new Error('Cannot decode token'));
      }

      const kid = decoded.header.kid;
      this.jwksClient.getSigningKey(kid, (err, key) => {
        if (err || !key) return reject(err ?? new Error('No signing key'));

        const publicKey = key.getPublicKey();
        jwt.verify(
          token,
          publicKey,
          { algorithms: ['RS256', 'ES256'] },
          (e, payload) => {
            if (e || !payload || typeof payload === 'string') {
              return reject(e ?? new Error('Invalid payload'));
            }
            resolve(payload);
          },
        );
      });
    });
  }

  private formatProfile(profile: {
    id: string;
    full_name: string | null;
    email: string | null;
    photoURL?: string | null;
    status: string;
    userRoles: { role: { id: string; key: string; name: string } }[];
  }): ProfileResponseDto {
    return {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      photoURL: profile.photoURL ?? null,
      status: profile.status,
      roles: profile.userRoles.map((ur) => ur.role),
    };
  }
}
