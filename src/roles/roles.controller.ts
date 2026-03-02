import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleResponseDto } from '../auth/dto/auth-response.dto';

@ApiTags('Roles')
@ApiCookieAuth('sb-access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all roles (ADMIN only)' })
  @ApiResponse({ status: 200, type: [RoleResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden – ADMIN role required' })
  findAll(): Promise<RoleResponseDto[]> {
    return this.rolesService.findAll();
  }
}
