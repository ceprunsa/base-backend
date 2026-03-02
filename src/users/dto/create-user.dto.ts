import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'csullcap@unsa.edu.pe' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'ADMIN' })
  @IsString()
  @IsNotEmpty()
  roleKey: string;
}
