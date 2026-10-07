import { Module } from '@nestjs/common';
import { VenuesModule } from '../venues/venues.module.js';
import { PromotionsController } from './promotions.controller.js';
import { PromotionsService } from './promotions.service.js';

@Module({
  imports: [VenuesModule],
  controllers: [PromotionsController],
  providers: [PromotionsService],
})
export class PromotionsModule {}
