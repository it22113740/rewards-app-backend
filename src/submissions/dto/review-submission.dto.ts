import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, MinLength, ValidateIf } from 'class-validator';
import { SubmissionStatus } from '@prisma/client';

export class ReviewSubmissionDto {
  @ApiProperty({ enum: SubmissionStatus })
  @IsEnum(SubmissionStatus)
  status: SubmissionStatus;

  @ApiPropertyOptional({ description: 'Required when status is REJECTED' })
  @ValidateIf((o) => o.status === 'REJECTED')
  @IsString()
  @MinLength(1, { message: 'Rejection reason is required when status is REJECTED' })
  rejectionReason?: string;
}
