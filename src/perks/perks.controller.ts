import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { Role } from '@prisma/client';
import { PerksService } from './perks.service.js';
import { CreatePerkDto } from './dto/create-perk.dto.js';
import { UpdatePerkDto } from './dto/update-perk.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Perks')
@Controller('perks')
@UsePipes(new ValidationPipe({ whitelist: true }))
export class PerksController {
  constructor(private readonly perksService: PerksService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Owner: create perk for a venue (stepper 3)' })
  @ApiResponse({ status: 201, description: 'Perk created' })
  async create(@CurrentUser() user: User, @Body() dto: CreatePerkDto) {
    return this.perksService.createForOwner(user, dto);
  }

  @Get('venue/:venueId')
  @ApiOperation({ summary: 'List perks for a venue (public)' })
  @ApiResponse({ status: 200, description: 'List of perks' })
  async findByVenue(@Param('venueId') venueId: string) {
    return this.perksService.findByVenue(venueId);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Owner: list perks across all my venues' })
  @ApiResponse({ status: 200, description: 'List of perks' })
  async findMine(@CurrentUser() user: User) {
    return this.perksService.findMine(user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Owner: update perk' })
  @ApiResponse({ status: 200, description: 'Perk updated' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdatePerkDto,
  ) {
    return this.perksService.updateForOwner(user, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Owner: delete perk' })
  @ApiResponse({ status: 200, description: 'Perk deleted' })
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.perksService.deleteForOwner(user, id);
  }
}
