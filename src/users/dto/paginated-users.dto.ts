import { ApiProperty } from '@nestjs/swagger';
import {
  InvitationResponseDto,
  ProfileResponseDto,
} from '../../auth/dto/auth-response.dto';

export class PaginatedUsersDto {
  @ApiProperty({
    type: 'array',
    items: {
      oneOf: [
        { $ref: `#/components/schemas/${ProfileResponseDto.name}` },
        { $ref: `#/components/schemas/${InvitationResponseDto.name}` },
      ],
    },
  })
  data: (ProfileResponseDto | InvitationResponseDto)[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}
