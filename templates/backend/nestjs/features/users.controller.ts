import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
{{#if SWAGGER}}
import { ApiTags } from '@nestjs/swagger';
{{/if}}
import { UsersService } from '{{IMPORT:app.usersService}}';
{{#if VIEWS}}
import { userView } from '{{IMPORT:views.user}}';
{{#if AUTH}}
import type { User } from '{{IMPORT:domain.user}}';
{{/if}}
{{else}}
import { toPublicUser{{#if AUTH}}, type User{{/if}} } from '{{IMPORT:domain.user}}';
{{/if}}
{{#if AUTH}}
import type { UploadedFile } from '{{IMPORT:port.fileStorage}}';
import { CurrentUser, RequirePermissions } from '{{IMPORT:nest.decorators}}';
import { Upload, UploadedFileOf } from '{{IMPORT:nest.upload}}';
{{/if}}
import { SearchPageQueryDto } from '{{IMPORT:nest.commonDto}}';
import { Endpoint } from '{{IMPORT:nest.endpoint}}';
import { USERS_MESSAGES } from '{{IMPORT:messages.users}}';
{{#if AUTH}}
import { UpdateProfileDto, UpdateUserDto, UserResponseDto, UserSummaryDto } from '{{IMPORT:nest.users.dto}}';
{{else}}
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '{{IMPORT:nest.users.dto}}';
{{/if}}

{{#if VIEWS}}
const one = userView.one;
{{else}}
const one = toPublicUser;
{{/if}}

{{#if SWAGGER}}
@ApiTags('Users')
{{/if}}
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}
{{#if AUTH}}

  // `me…` and `search` are declared before `:id` so they aren't read as ids.
  @Patch('me')
  @Endpoint({ summary: 'Update your profile (name, mobile number, location, bio)', message: USERS_MESSAGES.profileUpdated, response: UserResponseDto, errors: [401, 409, 422], bearer: true })
  async updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return one(await this.users.updateProfile(user.id, dto));
  }

  @Post('me/avatar')
  @Upload('avatar')
  @Endpoint({ summary: 'Upload a profile picture (multipart field `avatar`: JPEG, PNG, WebP or HEIC)', message: USERS_MESSAGES.avatarUpdated, status: 200, response: UserResponseDto, errors: [400, 401, 413, 422], bearer: true })
  async setAvatar(@CurrentUser() user: User, @UploadedFileOf('avatar') file: UploadedFile) {
    return one(await this.users.setAvatar(user.id, file));
  }

  @Delete('me/avatar')
  @Endpoint({ summary: 'Remove your profile picture', message: USERS_MESSAGES.avatarRemoved, response: UserResponseDto, errors: [401], bearer: true })
  async removeAvatar(@CurrentUser() user: User) {
    return one(await this.users.removeAvatar(user.id));
  }

{{#if DELETE_ACCOUNT}}
  @Delete('me')
  @Endpoint({ summary: 'Delete your account and its data (cannot be undone)', message: USERS_MESSAGES.accountDeleted, errors: [401], bearer: true })
  async deleteAccount(@CurrentUser() user: User) {
    await this.users.deleteAccount(user.id);
  }

{{/if}}
  @Get('search')
  @Endpoint({ summary: 'Other users A → Z, filtered by name / email (the app\'s "New chat" list; no search = everybody)', message: USERS_MESSAGES.list, response: UserSummaryDto, paginated: true, errors: [401, 422], bearer: true })
  search(@CurrentUser() user: User, @Query() query: SearchPageQueryDto) {
    return this.users.search(user.id, query);
  }

  @Get()
  @RequirePermissions('users:read')
  @Endpoint({ summary: 'List users (paginated, searchable) – permission users:read', message: USERS_MESSAGES.list, response: UserResponseDto, paginated: true, errors: [401, 403, 422], bearer: true })
  async list(@Query() query: SearchPageQueryDto) {
{{#if VIEWS}}
    return userView.page(await this.users.list(query));
{{else}}
    return (await this.users.list(query)).map(one);
{{/if}}
  }

  @Get(':id')
  @RequirePermissions('users:read')
  @Endpoint({ summary: 'Get a user – permission users:read', message: USERS_MESSAGES.user, response: UserResponseDto, errors: [401, 403, 404], bearer: true })
  async getById(@Param('id') id: string) {
    return one(await this.users.getById(id));
  }

  @Patch(':id')
  @RequirePermissions('users:write')
  @Endpoint({ summary: 'Update a user (name, role, active) – permission users:write', message: USERS_MESSAGES.updated, response: UserResponseDto, errors: [401, 403, 404, 422], bearer: true })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: User) {
    return one(await this.users.update(id, dto, actor.id));
  }

  @Post(':id/avatar')
  @RequirePermissions('users:write')
  @Upload('avatar')
  @Endpoint({ summary: "Upload a user's profile picture (multipart field `avatar`: JPEG, PNG, WebP or HEIC) – permission users:write", message: USERS_MESSAGES.avatarUpdated, status: 200, response: UserResponseDto, errors: [400, 401, 403, 404, 413, 422], bearer: true })
  async setAvatarOf(@Param('id') id: string, @UploadedFileOf('avatar') file: UploadedFile) {
    return one(await this.users.setAvatar(id, file));
  }

  @Delete(':id/avatar')
  @RequirePermissions('users:write')
  @Endpoint({ summary: "Remove a user's profile picture – permission users:write", message: USERS_MESSAGES.avatarRemoved, response: UserResponseDto, errors: [401, 403, 404], bearer: true })
  async removeAvatarOf(@Param('id') id: string) {
    return one(await this.users.removeAvatar(id));
  }

  @Delete(':id')
  @RequirePermissions('users:delete')
  @Endpoint({ summary: 'Delete a user – permission users:delete', message: USERS_MESSAGES.deleted, errors: [401, 403, 404], bearer: true })
  async delete(@Param('id') id: string, @CurrentUser() actor: User) {
    await this.users.delete(id, actor.id);
  }
{{else}}

  @Get()
  @Endpoint({ summary: 'List users (paginated, searchable)', message: USERS_MESSAGES.list, response: UserResponseDto, paginated: true, errors: [422] })
  async list(@Query() query: SearchPageQueryDto) {
{{#if VIEWS}}
    return userView.page(await this.users.list(query));
{{else}}
    return (await this.users.list(query)).map(one);
{{/if}}
  }

  @Post()
  @Endpoint({ summary: 'Create a user', message: USERS_MESSAGES.created, status: 201, response: UserResponseDto, errors: [409, 422] })
  async create(@Body() dto: CreateUserDto) {
    return one(await this.users.create(dto));
  }

  @Get(':id')
  @Endpoint({ summary: 'Get a user', message: USERS_MESSAGES.user, response: UserResponseDto, errors: [404] })
  async getById(@Param('id') id: string) {
    return one(await this.users.getById(id));
  }

  @Patch(':id')
  @Endpoint({ summary: 'Update a user', message: USERS_MESSAGES.updated, response: UserResponseDto, errors: [404, 422] })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return one(await this.users.update(id, dto));
  }

  @Delete(':id')
  @Endpoint({ summary: 'Delete a user', message: USERS_MESSAGES.deleted, errors: [404] })
  async delete(@Param('id') id: string) {
    await this.users.delete(id);
  }
{{/if}}
}
