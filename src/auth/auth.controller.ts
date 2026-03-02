import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import * as express from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

const COOKIE_NAME = 'sb-access-token';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly isProduction: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {
    this.isProduction = config.get<string>('NODE_ENV') === 'production';
  }

  // ── POST /auth/session ──────────────────────────────────────────────────
  @Post('session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create server session from Supabase access_token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid token' })
  async createSession(
    @Body() dto: CreateSessionDto,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<AuthResponseDto> {
    const user = await this.authService.createSession(dto.access_token);

    res.cookie(COOKIE_NAME, dto.access_token, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'strict' : 'lax',
      path: '/',
      // Token lifetime: 1 hour (Supabase default)
      maxAge: 60 * 60 * 1000,
    });

    return { message: 'Session created successfully', user };
  }

  // ── POST /auth/logout ───────────────────────────────────────────────────
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear the session cookie' })
  @ApiResponse({ status: 200, description: 'Logged out' })
  logout(@Res({ passthrough: true }) res: express.Response) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return { message: 'Logged out successfully' };
  }
}
