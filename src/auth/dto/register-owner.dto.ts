import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterOwnerDto {
  @ApiProperty({ example: 'owner@example.com' })
  @IsEmail()
  gmail: string;

  @ApiProperty({ example: '123 Main St, City' })
  @IsString()
  @MinLength(1)
  address: string;

  @ApiProperty({ example: 'securepass123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}
