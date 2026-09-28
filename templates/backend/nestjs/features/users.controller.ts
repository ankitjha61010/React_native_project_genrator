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
{{#if AUTH}}
import { SearchUsersQueryDto, UpdateProfileDto, UpdateUserDto, UserResponseDto, UserSummaryDto } from '{{IMPORT:nest.users.dto}}';
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
  @Endpoint({ summary: 'Update your profile (name, mobile number, location, bio)', message: 'Profile updated', response: UserResponseDto, errors: [401, 409, 422], bearer: true })
  async updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return one(await this.users.updateProfile(user.id, dto));
  }

  @Post('me/avatar')
  @Upload('avatar')
  @Endpoint({ summary: 'Upload a profile picture (multipart field `avatar`: JPEG, PNG, WebP or HEIC)', message: 'Avatar updated', status: 200, response: UserResponseDto, errors: [400, 401, 413, 422], bearer: true })
  async setAvatar(@CurrentUser() user: User, @UploadedFileOf('avatar') file: UploadedFile) {
    return one(await this.users.setAvatar(user.id, file));
  }

  @Delete('me/avatar')
  @Endpoint({ summary: 'Remove your profile picture', message: 'Avatar removed', response: UserResponseDto, errors: [401], bearer: true })
  async removeAvatar(@CurrentUser() user: User) {
    return one(await this.users.removeAvatar(user.id));
  }

  @Delete('me')
  @Endpoint({ summary: 'Delete your account and its data', message: 'Account deleted', errors: [401], bearer: true })
  async deleteAccount(@CurrentUser() user: User) {
    await this.users.deleteAccount(user.id);
  }

  @Get('search')
  @Endpoint({ summary: 'Find other users by name or email (e.g. to start a chat)', message: 'Users', response: UserSummaryDto, array: true, errors: [401, 422], bearer: true })
  search(@CurrentUser() user: User, @Query() query: SearchUsersQueryDto) {
    return this.users.search(user.id, query.q, query.limit);
  }

  @Get()
  @RequirePermissions('users:read')
  @Endpoint({ summary: 'List users (paginated, searchable) – permission users:read', message: 'Users', response: UserResponseDto, paginated: true, errors: [401, 403, 422], bearer: true })
  async list(@Query() query: SearchPageQueryDto) {
{{#if VIEWS}}
    return userView.page(await this.users.list(query));
{{else}}
    return (await this.users.list(query)).map(one);
{{/if}}
  }

  @Get(':id')
  @RequirePermissions('users:read')
  @Endpoint({ summary: 'Get a user – permission users:read', message: 'User', response: UserResponseDto, errors: [401, 403, 404], bearer: true })
  async getById(@Param('id') id: string) {
    return one(await this.users.getById(id));
  }

  @Patch(':id')
  @RequirePermissions('users:write')
  @Endpoint({ summary: 'Update a user (name, role, active) – permission users:write', message: 'User updated', response: UserResponseDto, errors: [401, 403, 404, 422], bearer: true })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: User) {
    return one(await this.users.update(id, dto, actor.id));
  }

  @Delete(':id')
  @RequirePermissions('users:delete')
  @Endpoint({ summary: 'Delete a user – permission users:delete', message: 'User deleted', errors: [401, 403, 404], bearer: true })
  async delete(@Param('id') id: string, @CurrentUser() actor: User) {
    await this.users.delete(id, actor.id);
  }
{{else}}

  @Get()
  @Endpoint({ summary: 'List users (paginated, searchable)', message: 'Users', response: UserResponseDto, paginated: true, errors: [422] })
  async list(@Query() query: SearchPageQueryDto) {
{{#if VIEWS}}
    return userView.page(await this.users.list(query));
{{else}}
    return (await this.users.list(query)).map(one);
{{/if}}
  }

  @Post()
  @Endpoint({ summary: 'Create a user', message: 'User created', status: 201, response: UserResponseDto, errors: [409, 422] })
  async create(@Body() dto: CreateUserDto) {
    return one(await this.users.create(dto));
  }

  @Get(':id')
  @Endpoint({ summary: 'Get a user', message: 'User', response: UserResponseDto, errors: [404] })
  async getById(@Param('id') id: string) {
    return one(await this.users.getById(id));
  }

  @Patch(':id')
  @Endpoint({ summary: 'Update a user', message: 'User updated', response: UserResponseDto, errors: [404, 422] })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return one(await this.users.update(id, dto));
  }

  @Delete(':id')
  @Endpoint({ summary: 'Delete a user', message: 'User deleted', errors: [404] })
  async delete(@Param('id') id: string) {
    await this.users.delete(id);
  }
{{/if}}
}
