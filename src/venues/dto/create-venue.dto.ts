import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateVenueDto {
  @ApiProperty({ example: 'Cool Bar' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: '123 Main St, City' })
  @IsString()
  @MinLength(1)
  address: string;

  @ApiProperty({ example: 12.9716 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: 77.5946 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiProperty({ example: 150, description: 'Geofence radius in meters' })
  @IsInt()
  @Min(10)
  radiusMeters: number;

  @ApiProperty({ example: 20 })
  @IsInt()
  @Min(0)
  pointsPerVideo: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  pointsPerPhoto: number;

  @ApiPropertyOptional({ example: 'coolbar' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  /** Cloudinary URL from POST /upload (shop image). Upload image first, then pass mediaUrl here. */
  @ApiPropertyOptional({ description: 'Shop image URL from Cloudinary (upload via POST /upload first)' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

