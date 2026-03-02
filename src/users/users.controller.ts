import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { PaginateQueryDto } from './dto/paginate-query.dto';
import { PaginatedUsersDto } from './dto/paginated-users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  InvitationResponseDto,
  ProfileResponseDto,
} from '../auth/dto/auth-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('Users')
@ApiCookieAuth('sb-access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── GET /me ─────────────────────────────────────────────────────────────
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile (USER, ADMIN)' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  async getMe(
    @CurrentUser() user: { id: string },
  ): Promise<ProfileResponseDto> {
    return await this.usersService.findMe(user.id);
  }

  // ── GET /users ───────────────────────────────────────────────────────────
  @Get('users')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all users paginated (ADMIN only)' })
  @ApiResponse({ status: 200, type: PaginatedUsersDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden – ADMIN role required' })
  async findAll(@Query() query: PaginateQueryDto): Promise<PaginatedUsersDto> {
    return await this.usersService.findAll(query.page ?? 1, query.limit ?? 20);
  }

  // ── POST /users ──────────────────────────────────────────────────────────
  @Post('users')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create user from Google email (ADMIN only)' })
  @ApiResponse({
    status: 201,
    description: 'Returns either the created profile or the invitation status',
  })
  async create(
    @Body() dto: CreateUserDto,
  ): Promise<ProfileResponseDto | InvitationResponseDto> {
    return await this.usersService.create(dto);
  }

  // ── PATCH /users/:id/role ────────────────────────────────────────────────
  @Patch('users/:id/role')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update user role (ADMIN only)' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<ProfileResponseDto> {
    return await this.usersService.updateRole(id, dto.roleKey);
  }

  // ── DELETE /users/:id ───────────────────────────────────────────────────
  @Delete('users/:idOrEmail')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a user or invitation (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'User or invitation deleted' })
  @ApiResponse({ status: 404, description: 'User or invitation not found' })
  async remove(@Param('idOrEmail') idOrEmail: string): Promise<any> {
    return await this.usersService.remove(idOrEmail);
  }
}
