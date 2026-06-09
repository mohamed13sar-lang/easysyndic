import { Injectable } from '@nestjs/common';
import { APP_NAME } from '../common/constants/app.constants';

@Injectable()
export class HealthService {
  getHealthStatus() {
    return {
      status: 'ok',
      app: APP_NAME,
    };
  }
}
