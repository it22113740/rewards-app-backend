import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

export class GeofenceCheckDto {
  @ApiProperty({ example: 37.7749, description: 'Current user latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: -122.4194, description: 'Current user longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}
