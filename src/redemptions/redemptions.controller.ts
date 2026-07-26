import {
  Body,
  Controller,
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
import { RedemptionsService } from './redemptions.service.js';
import { RedeemPerkDto } from './dto/redeem-perk.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Redemptions')
@Controller('redemptions')
@UsePipes(new ValidationPipe({ whitelist: true }))
export class RedemptionsController {
  constructor(private readonly redemptionsService: RedemptionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'User: redeem a perk (deducts points, returns promo code)' })
  @ApiResponse({ status: 201, description: 'Redemption with promo code' })
  async redeem(@CurrentUser() user: User, @Body() dto: RedeemPerkDto) {
    return this.redemptionsService.redeem(user, dto.perkId);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'User: list my redemptions' })
  @ApiResponse({ status: 200, description: 'List of redemptions' })
  async findMine(@CurrentUser() user: User) {
    return this.redemptionsService.findMyRedemptions(user);
  }

  @Get('venue/:venueId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Owner: list redemptions for a venue' })
  @ApiResponse({ status: 200, description: 'List of redemptions with promo codes' })
  async findByVenue(@CurrentUser() user: User, @Param('venueId') venueId: string) {
    return this.redemptionsService.findByVenue(venueId, user);
  }

  @Get('owner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Owner: list redemptions across all my venues' })
  @ApiResponse({ status: 200, description: 'List of redemptions' })
  async findForOwner(@CurrentUser() user: User) {
    return this.redemptionsService.findForOwner(user);
  }

  @Patch(':id/used')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Owner: mark redemption as used' })
  @ApiResponse({ status: 200, description: 'Redemption marked as used' })
  async markAsUsed(@CurrentUser() user: User, @Param('id') id: string) {
    return this.redemptionsService.markAsUsed(id, user);
  }
}
