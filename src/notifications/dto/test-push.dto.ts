import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TestPushDto {
  @ApiPropertyOptional({ example: 'Test push from Rewards App' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ example: 'If you see this, push delivery works.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  body?: string;
}
