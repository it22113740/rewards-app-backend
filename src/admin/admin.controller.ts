import {
  applyDecorators,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { Role } from '@prisma/client';
import { LoginDto } from '../auth/dto/login.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { AdminService } from './admin.service.js';
import { BanUserDto } from './dto/ban-user.dto.js';
import { StoreListQueryDto, UserListQueryDto } from './dto/list-query.dto.js';
import { OnboardStoreDto } from './dto/onboard-store.dto.js';

function Superadmin() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(Role.SUPERADMIN),
    ApiBearerAuth('JWT-auth'),
  );
}

@ApiTags('Admin')
@Controller('admin')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  @ApiOperation({ summary: 'Superadmin: sign in to the Hunt desk' })
  login(@Body() dto: LoginDto) {
    return this.adminService.login(dto);
  }

  @Get('overview')
  @Superadmin()
  @ApiOperation({ summary: 'Superadmin: store, people, and post counts' })
  overview() {
    return this.adminService.overview();
  }

  @Get('stores')
  @Superadmin()
  @ApiOperation({ summary: 'Superadmin: list onboarded stores' })
  stores(@Query() query: StoreListQueryDto) {
    return this.adminService.listStores(query);
  }

  @Post('stores')
  @Superadmin()
  @ApiOperation({ summary: 'Superadmin: onboard a store and its owner' })
  onboard(@Body() dto: OnboardStoreDto) {
    return this.adminService.onboardStore(dto);
  }

  @Post('stores/:id/ban')
  @Superadmin()
  @ApiOperation({ summary: 'Superadmin: ban a store so guests can no longer use it' })
  banStore(@Param('id') id: string, @Body() dto: BanUserDto) {
    return this.adminService.banStore(id, dto);
  }

  @Post('stores/:id/unban')
  @Superadmin()
  @ApiOperation({ summary: 'Superadmin: restore a banned store' })
  unbanStore(@Param('id') id: string) {
    return this.adminService.unbanStore(id);
  }

  @Get('users')
  @Superadmin()
  @ApiOperation({ summary: 'Superadmin: list guests and store owners' })
  users(@Query() query: UserListQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Post('users/:id/ban')
  @Superadmin()
  @ApiOperation({ summary: 'Superadmin: ban a guest or store owner' })
  ban(@CurrentUser() actor: User, @Param('id') id: string, @Body() dto: BanUserDto) {
    return this.adminService.banUser(actor, id, dto);
  }

  @Post('users/:id/unban')
  @Superadmin()
  @ApiOperation({ summary: 'Superadmin: restore a banned account' })
  unban(@Param('id') id: string) {
    return this.adminService.unbanUser(id);
  }
}
