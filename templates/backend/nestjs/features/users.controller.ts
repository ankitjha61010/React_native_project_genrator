{{#if AUTH}}
import { Body, Controller, Delete, Get{{#if STYLE_USECASE}}, Inject{{/if}}, Param, Patch, Query } from '@nestjs/common';
{{else}}
import { Body, Controller, Delete, Get, HttpCode{{#if STYLE_USECASE}}, Inject{{/if}}, Param, Patch, Post, Query } from '@nestjs/common';
{{/if}}
{{#if SWAGGER}}
import { {{#if AUTH}}ApiBearerAuth, {{/if}}ApiOperation, ApiTags } from '@nestjs/swagger';
{{/if}}
{{#if STYLE_SERVICE}}
import { UsersService } from '{{IMPORT:app.usersService}}';
{{else}}
import type { UsersUseCases } from '{{IMPORT:nest.users.providers}}';
import { USERS_USE_CASES } from '{{IMPORT:nest.tokens}}';
{{/if}}
{{#if VIEWS}}
import { userView } from '{{IMPORT:views.user}}';
{{else}}
import { toPublicUser{{#if AUTH}}, type User{{/if}} } from '{{IMPORT:domain.user}}';
{{/if}}
{{#if VIEWS}}
{{#if AUTH}}
import type { User } from '{{IMPORT:domain.user}}';
{{/if}}
{{/if}}
{{#if SWAGGER}}
import { ApiEnvelope, ApiErrors } from '{{IMPORT:nest.apiResponses}}';
{{/if}}
{{#if AUTH}}
import { CurrentUser, RequirePermissions, ResponseMessage } from '{{IMPORT:nest.decorators}}';
import { ListUsersQueryDto, UpdateProfileDto, UpdateUserDto{{#if SWAGGER}}, UserResponseDto{{/if}} } from '{{IMPORT:nest.users.dto}}';
{{else}}
import { ResponseMessage } from '{{IMPORT:nest.decorators}}';
import { CreateUserDto, ListUsersQueryDto, UpdateUserDto{{#if SWAGGER}}, UserResponseDto{{/if}} } from '{{IMPORT:nest.users.dto}}';
{{/if}}

{{#if VIEWS}}
const one = userView.one;
{{else}}
const one = toPublicUser;
{{/if}}

{{#if SWAGGER}}
@ApiTags('Users')
{{#if AUTH}}
@ApiBearerAuth()
{{/if}}
{{/if}}
@Controller('users')
export class UsersController {
  constructor({{#if STYLE_SERVICE}}private readonly users: UsersService{{else}}@Inject(USERS_USE_CASES) private readonly users: UsersUseCases{{/if}}) {}
{{#if AUTH}}

  // Declared before `:id` so "me" isn't read as an id.
  @Patch('me')
{{#if SWAGGER}}
  @ApiOperation({ summary: 'Update your own profile' })
  @ApiEnvelope(UserResponseDto, { description: 'Profile updated' })
  @ApiErrors(401, 422)
{{/if}}
  @ResponseMessage('Profile updated')
  async updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return one(await this.users.updateProfile{{CALL}}(user.id, dto));
  }
{{/if}}

  @Get()
{{#if AUTH}}
  @RequirePermissions('users:read')
{{/if}}
{{#if SWAGGER}}
  @ApiOperation({ summary: 'List users (paginated, searchable){{#if AUTH}} – permission users:read{{/if}}' })
  @ApiEnvelope(UserResponseDto, { paginated: true, description: 'Users' })
  @ApiErrors({{#if AUTH}}401, 403, {{/if}}422)
{{/if}}
  @ResponseMessage('Users')
  async list(@Query() query: ListUsersQueryDto) {
{{#if VIEWS}}
    return userView.page(await this.users.list{{CALL}}(query));
{{else}}
    return (await this.users.list{{CALL}}(query)).map(one);
{{/if}}
  }

  @Get(':id')
{{#if AUTH}}
  @RequirePermissions('users:read')
{{/if}}
{{#if SWAGGER}}
  @ApiOperation({ summary: 'Get a user{{#if AUTH}} – permission users:read{{/if}}' })
  @ApiEnvelope(UserResponseDto, { description: 'User' })
  @ApiErrors({{#if AUTH}}401, 403, {{/if}}404)
{{/if}}
  @ResponseMessage('User')
  async getById(@Param('id') id: string) {
    return one(await this.users.getById{{CALL}}(id));
  }
{{#if NO_AUTH}}

  @Post()
  @HttpCode(201)
{{#if SWAGGER}}
  @ApiOperation({ summary: 'Create a user' })
  @ApiEnvelope(UserResponseDto, { status: 201, description: 'User created' })
  @ApiErrors(409, 422)
{{/if}}
  @ResponseMessage('User created')
  async create(@Body() dto: CreateUserDto) {
    return one(await this.users.create{{CALL}}(dto));
  }
{{/if}}

  @Patch(':id')
{{#if AUTH}}
  @RequirePermissions('users:write')
{{/if}}
{{#if SWAGGER}}
  @ApiOperation({ summary: 'Update a user{{#if AUTH}} – permission users:write{{/if}}' })
  @ApiEnvelope(UserResponseDto, { description: 'User updated' })
  @ApiErrors({{#if AUTH}}401, 403, {{/if}}404, 422)
{{/if}}
  @ResponseMessage('User updated')
{{#if AUTH}}
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: User) {
    return one(await this.users.update{{CALL}}(id, dto, actor.id));
  }
{{else}}
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return one(await this.users.update{{CALL}}(id, dto));
  }
{{/if}}

  @Delete(':id')
{{#if AUTH}}
  @RequirePermissions('users:delete')
{{/if}}
{{#if SWAGGER}}
  @ApiOperation({ summary: 'Delete a user{{#if AUTH}} – permission users:delete{{/if}}' })
  @ApiEnvelope(null, { description: 'User deleted' })
  @ApiErrors({{#if AUTH}}401, 403, {{/if}}404)
{{/if}}
  @ResponseMessage('User deleted')
{{#if AUTH}}
  async delete(@Param('id') id: string, @CurrentUser() actor: User) {
    await this.users.delete{{CALL}}(id, actor.id);
    return null;
  }
{{else}}
  async delete(@Param('id') id: string) {
    await this.users.delete{{CALL}}(id);
    return null;
  }
{{/if}}
}
