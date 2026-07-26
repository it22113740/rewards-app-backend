import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, MinLength, ArrayMinSize, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSubmissionItemDto } from './create-submission-item.dto.js';

const MAX_ITEMS = 20;

export class CreateSubmissionsBatchDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  venueId: string;

  @ApiProperty({ type: [CreateSubmissionItemDto], maxItems: MAX_ITEMS })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one item (type + mediaUrl) is required' })
  @ArrayMaxSize(MAX_ITEMS, { message: `Maximum ${MAX_ITEMS} items per batch` })
  @ValidateNested({ each: true })
  @Type(() => CreateSubmissionItemDto)
  items: CreateSubmissionItemDto[];
}
