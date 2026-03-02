import { ApiProperty } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'ADMIN' })
  key: string;

  @ApiProperty({ example: 'Administrador' })
  name: string;
}

export class ProfileResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  id: string;

  @ApiProperty({ example: 'Juan Pérez', nullable: true })
  full_name: string | null;

  @ApiProperty({ example: 'usuario@unsa.edu.pe', nullable: true })
  email: string | null;

  @ApiProperty({
    example: 'https://example.com/photo.jpg',
    nullable: true,
  })
  photoURL: string | null;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiProperty({ type: [RoleResponseDto] })
  roles: RoleResponseDto[];
}

export class InvitationResponseDto {
  @ApiProperty({ example: 'csullcap@unsa.edu.pe' })
  email: string;

  @ApiProperty({ example: 'ADMIN' })
  roleKey: string;

  @ApiProperty({ example: 'INVITED' })
  status: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'Session created successfully' })
  message: string;

  @ApiProperty({ type: ProfileResponseDto })
  user: ProfileResponseDto;
}
