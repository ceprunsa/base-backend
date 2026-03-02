import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';

@Module({
  imports: [
    // Config (global – no need to import in each module)
    ConfigModule.forRoot({ isGlobal: true }),

    // Database
    PrismaModule,

    // Features
    AuthModule,
    UsersModule,
    RolesModule,
  ],
})
export class AppModule {}
