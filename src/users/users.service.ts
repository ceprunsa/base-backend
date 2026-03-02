import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

const PROFILE_WITH_ROLES = {
  userRoles: { include: { role: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
      include: PROFILE_WITH_ROLES,
    });

    if (!profile) throw new NotFoundException('Profile not found');

    return this.format(profile);
  }

  async create(dto: CreateUserDto) {
    // 0. Check for existing profile or invitation
    const [existingProfile, existingInvitation] = await Promise.all([
      this.prisma.profile.findUnique({ where: { email: dto.email } }),
      this.prisma.userInvitation.findUnique({ where: { email: dto.email } }),
    ]);

    if (existingProfile || existingInvitation) {
      throw new ConflictException(
        'User already exists or has a pending invitation',
      );
    }

    // 1. Get userId from auth.users (Supabase)
    const authUser = await this.prisma.$queryRaw<
      { id: string; photoURL: string | null; fullName: string | null }[]
    >`
      SELECT 
        id, 
        raw_user_meta_data->>'avatar_url' as photoURL,
        raw_user_meta_data->>'full_name' as fullName
      FROM auth.users 
      WHERE email = ${dto.email} 
      LIMIT 1
    `;

    // 2. Get role
    const role = await this.prisma.role.findUnique({
      where: { key: dto.roleKey },
    });
    if (!role) throw new NotFoundException(`Role ${dto.roleKey} not found`);

    // 3. Handle based on whether user exists in Supabase
    if (authUser.length === 0) {
      // User doesn't exist in Supabase yet -> Create invitation (MANDATORY FLOW)
      const invitation = await this.prisma.userInvitation.create({
        data: { email: dto.email, roleKey: dto.roleKey },
      });
      return {
        email: invitation.email,
        roleKey: invitation.roleKey,
        status: 'INVITED',
      };
    }

    const userId = authUser[0].id;

    // 4. User ALREADY exists in Supabase -> This is an "administrative" profile creation
    // We create the profile and role directly as if they were invited.
    return this.prisma.$transaction(async (tx) => {
      const photoURL = authUser[0].photoURL;
      const fullName = authUser[0].fullName;

      const profile = await tx.profile.create({
        data: {
          id: userId,
          email: dto.email,
          photoURL,
          full_name: fullName,
        },
      });

      await tx.userRole.create({
        data: { userId, roleId: role.id },
      });

      return this.format({ ...profile, userRoles: [{ role }] });
    });
  }

  async updateRole(userId: string, roleKey: string) {
    const role = await this.prisma.role.findUnique({
      where: { key: roleKey },
    });

    if (!role) throw new NotFoundException(`Role ${roleKey} not found`);

    return this.prisma.$transaction(async (tx) => {
      // Clear existing roles
      await tx.userRole.deleteMany({ where: { userId } });

      // Assign new role
      await tx.userRole.create({
        data: { userId, roleId: role.id },
      });

      return this.findMe(userId);
    });
  }

  async remove(idOrEmail: string) {
    // 1. Try to delete invitation by email
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { email: idOrEmail },
    });

    if (invitation) {
      return await this.prisma.userInvitation.delete({
        where: { email: idOrEmail },
      });
    }

    // 2. Try to delete profile by ID (if it's a UUID)
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrEmail,
      );

    if (isUuid) {
      const profile = await this.prisma.profile.findUnique({
        where: { id: idOrEmail },
      });

      if (profile) {
        return await this.prisma.profile.delete({
          where: { id: idOrEmail },
        });
      }
    }

    // 3. Fallback: try to find profile by email if idOrEmail looks like an email
    if (idOrEmail.includes('@')) {
      const profile = await this.prisma.profile.findUnique({
        where: { email: idOrEmail },
      });

      if (profile) {
        return await this.prisma.profile.delete({
          where: { id: profile.id },
        });
      }
    }

    throw new NotFoundException(`User or invitation not found: ${idOrEmail}`);
  }

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [profiles, invitations, totalProfiles, totalInvitations] =
      await Promise.all([
        this.prisma.profile.findMany({
          orderBy: { createdAt: 'desc' },
          include: PROFILE_WITH_ROLES,
        }),
        this.prisma.userInvitation.findMany({
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.profile.count(),
        this.prisma.userInvitation.count(),
      ]);

    // Merge and sort by createdAt
    const combined = [
      ...profiles.map((p) => ({ ...this.format(p), createdAt: p.createdAt })),
      ...invitations.map((i) => ({
        email: i.email,
        roleKey: i.roleKey,
        status: 'INVITED',
        createdAt: i.createdAt,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = totalProfiles + totalInvitations;
    const paginatedData = combined.slice(skip, skip + limit);

    return {
      data: paginatedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private format(profile: {
    id: string;
    full_name: string | null;
    email: string | null;
    photoURL: string | null;
    status: string;
    userRoles: { role: { id: string; key: string; name: string } }[];
  }) {
    return {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      photoURL: profile.photoURL,
      status: profile.status,
      roles: profile.userRoles.map((ur) => ur.role),
    };
  }
}
