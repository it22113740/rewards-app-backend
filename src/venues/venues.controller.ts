import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { VenuesService } from './venues.service.js';
import { CreateVenueDto } from './dto/create-venue.dto.js';
import { UpdateVenueDto } from './dto/update-venue.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '@prisma/client';

@ApiTags('Venues')
@Controller('venues')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Owner: create venue (stepper 1 + points)' })
  @ApiResponse({ status: 201, description: 'Venue created' })
  async create(@CurrentUser() user: User, @Body() dto: CreateVenueDto) {
    return this.venuesService.createForOwner(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Public: get all shops (venues)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max items (default 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Skip N items' })
  @ApiResponse({ status: 200, description: 'List of venues with name, description, category, imageUrl' })
  async findAll(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.venuesService.findAll(
      limit !== undefined ? Number(limit) : 100,
      offset !== undefined ? Number(offset) : 0,
    );
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Owner: list my venues' })
  @ApiResponse({ status: 200, description: 'List of venues' })
  async findMine(@CurrentUser() user: User) {
    return this.venuesService.findMine(user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Owner: update venue' })
  @ApiResponse({ status: 200, description: 'Venue updated' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateVenueDto,
  ) {
    return this.venuesService.updateForOwner(user, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Owner: delete venue' })
  @ApiResponse({ status: 200, description: 'Venue deleted' })
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.venuesService.deleteForOwner(user, id);
  }

  @Get('near')
  @ApiOperation({ summary: 'Find venues near coordinates (public)' })
  @ApiQuery({ name: 'lat', required: true })
  @ApiQuery({ name: 'lng', required: true })
  @ApiQuery({ name: 'radius', required: false, description: 'Meters' })
  @ApiResponse({ status: 200, description: 'Venues with distance' })
  async findNearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius?: number,
  ) {
    return this.venuesService.findNearby(
      Number(lat),
      Number(lng),
      radius !== undefined ? Number(radius) : undefined,
    );
  }
}

