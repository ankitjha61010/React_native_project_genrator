import { Module } from '@nestjs/common';
import { USERS_REPOSITORY } from '{{IMPORT:nest.tokens}}';
import { UsersController } from '{{IMPORT:nest.users.controller}}';
import { usersProviders } from '{{IMPORT:nest.users.providers}}';

/** Exports the users repository – the only thing other modules (auth) may use. */
@Module({ controllers: [UsersController], providers: usersProviders, exports: [USERS_REPOSITORY] })
export class UsersModule {}
