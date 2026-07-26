import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { PerkType } from '@prisma/client';

export class CreatePerkDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  venueId: string;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(1)
  pointsRequired: number;

  @ApiProperty({ example: 'Free drink' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: PerkType })
  @IsEnum(PerkType)
  type: PerkType;

  @ApiPropertyOptional({ description: 'When type is DISCOUNT, e.g. 10 for 10% off' })
  @IsOptional()
  @IsInt()
  @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promoCodePrefix?: string;

  @ApiPropertyOptional({ description: 'Optional cover image URL (e.g. from POST /upload)' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
