import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class OnboardStoreDto {
  @ApiProperty({ enum: ['new', 'existing'] })
  @IsIn(['new', 'existing'])
  mode: 'new' | 'existing';

  @ApiProperty({ example: 'owner@cafe.test' })
  @IsEmail()
  ownerEmail: string;

  @ApiPropertyOptional({ minLength: 8, description: 'Required when mode is new' })
  @ValidateIf((dto: OnboardStoreDto) => dto.mode === 'new')
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  @ApiProperty({ example: 'Kala Cafe' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: '12 Galle Road, Colombo' })
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  address: string;

  @ApiProperty({ example: 6.9271 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: 79.8612 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiPropertyOptional({ default: 100, description: 'Geofence radius in meters' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(5000)
  radiusMeters?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  pointsPerPhoto?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  pointsPerVideo?: number;

  @ApiPropertyOptional({ example: 'Cafe' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
