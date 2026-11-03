import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class BanUserDto {
  @ApiProperty({ example: 'Repeated fake check-ins' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
