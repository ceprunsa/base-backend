import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwksClient } from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwksClient: JwksClient;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwksUrl = this.config.getOrThrow<string>('SUPABASE_JWKS_URL');
    this.jwksClient = new JwksClient({ jwksUri: jwksUrl, cache: true });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Read token from HTTP-only cookie
    const token: string | undefined = request.cookies?.['sb-access-token'];
    if (!token) {
      throw new UnauthorizedException('No session cookie found');
    }

    let userId: string;
    try {
      userId = await this.verifyToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Load profile + roles from database
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });

    if (!profile) {
      throw new UnauthorizedException('Profile not found');
    }

    request['user'] = {
      id: profile.id,
      full_name: profile.full_name,
      status: profile.status,
      roles: profile.userRoles.map((ur) => ur.role),
    };

    return true;
  }

  private verifyToken(token: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Decode header to get kid
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
            const sub = payload.sub;
            if (!sub) return reject(new Error('Missing sub claim'));
            resolve(sub);
          },
        );
      });
    });
  }
}
