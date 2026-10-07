import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CreatePromotionDto } from './dto/create-promotion.dto.js';
import { UpdatePromotionDto } from './dto/update-promotion.dto.js';
import { PromotionsService } from './promotions.service.js';

@ApiTags('Promotions')
@Controller('promotions')
@UsePipes(new ValidationPipe({ whitelist: true }))
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Owner: create a promotion for a shop' })
  create(@CurrentUser() user: User, @Body() dto: CreatePromotionDto) {
    return this.promotionsService.createForOwner(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List promotions guests can browse' })
  findPublic() {
    return this.promotionsService.findPublic();
  }

  @Get('venue/:venueId')
  @ApiOperation({ summary: 'List promotions for a shop (public)' })
  findByVenue(@Param('venueId') venueId: string) {
    return this.promotionsService.findByVenue(venueId);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Owner: list promotions across my shops' })
  findMine(@CurrentUser() user: User) {
    return this.promotionsService.findMine(user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth('JWT-auth')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotionsService.updateForOwner(user, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth('JWT-auth')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.promotionsService.deleteForOwner(user, id);
  }
}
