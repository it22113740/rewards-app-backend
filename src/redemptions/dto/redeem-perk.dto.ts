import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RedeemPerkDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  perkId: string;
}
