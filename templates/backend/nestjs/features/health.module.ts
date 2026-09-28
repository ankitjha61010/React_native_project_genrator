import { Module } from '@nestjs/common';
import { HealthController } from '{{IMPORT:nest.health.controller}}';
import { healthProviders } from '{{IMPORT:nest.health.providers}}';

@Module({ controllers: [HealthController], providers: healthProviders })
export class HealthModule {}
