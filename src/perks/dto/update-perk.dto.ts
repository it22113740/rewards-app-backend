import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { PerkType } from '@prisma/client';

export class UpdatePerkDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  pointsRequired?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: PerkType })
  @IsOptional()
  @IsEnum(PerkType)
  type?: PerkType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promoCodePrefix?: string;

  @ApiPropertyOptional({ description: 'Optional cover image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
