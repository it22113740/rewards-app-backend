import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class KeepAliveService {
  private readonly logger = new Logger(KeepAliveService.name);
  private readonly targetUrl =
    process.env.SELF_PING_URL || process.env.RENDER_EXTERNAL_URL || '';

  // Every 14 minutes to keep free hosting warm
  @Cron('*/14 * * * *')
  async pingSelf() {
    if (!this.targetUrl) return;

    try {
      const res = await fetch(this.targetUrl, { method: 'GET' });
      this.logger.log(`Self ping ${res.status} ${this.targetUrl}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Self ping failed: ${message}`);
    }
  }
}
