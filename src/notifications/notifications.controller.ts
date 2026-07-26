import { Body, Controller, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { GeofenceCheckDto } from './dto/geofence-check.dto.js';
import { NotificationsService } from './notifications.service.js';
import { TestPushDto } from './dto/test-push.dto.js';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@UsePipes(new ValidationPipe({ whitelist: true }))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('test-push')
  @ApiOperation({ summary: 'Send a test push notification to the authenticated user' })
  @ApiResponse({ status: 200, description: 'Push send attempt result' })
  async testPush(@CurrentUser() user: User, @Body() dto: TestPushDto) {
    return this.notificationsService.testPush(user.id, dto);
  }

  @Post('geofence-check')
  @ApiOperation({
    summary: 'Check whether current user is inside any venue geofence and compute remaining points',
  })
  @ApiResponse({ status: 200, description: 'Geofence check result with personalized messages' })
  async geofenceCheck(@CurrentUser() user: User, @Body() dto: GeofenceCheckDto) {
    return this.notificationsService.geofenceCheck(user.id, user.role, dto);
  }
}
