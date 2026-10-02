import type { ErrorMessage } from '{{IMPORT:core.messages}}';

/** Every message of the users feature – change the wording here. */
export const USERS_MESSAGES = {
  list: 'Users',
  user: 'User',
  created: 'User created',
  updated: 'User updated',
  deleted: 'User deleted',
{{#if AUTH}}
  profileUpdated: 'Profile updated',
  avatarUpdated: 'Avatar updated',
  avatarRemoved: 'Avatar removed',
{{#if DELETE_ACCOUNT}}
  accountDeleted: 'Account deleted',
{{/if}}
{{/if}}
  // ── errors ─────────────────────────────────────────────────────────────────
  notFound: { message: 'User not found', code: 'USER_NOT_FOUND' },
{{#if AUTH}}
  accountExists: { message: 'Email or mobile number is already registered', code: 'ACCOUNT_EXISTS' },
  phoneTaken: { message: 'Mobile number is already registered', code: 'PHONE_TAKEN' },
  countryCodeRequired: { message: 'countryCode is required with phone', code: 'COUNTRY_CODE_REQUIRED' },
  invalidAvatar: { message: 'The avatar must be a JPEG, PNG, WebP or HEIC image', code: 'INVALID_FILE_TYPE' },
  selfModification: { message: 'You cannot change your own role or disable your own account', code: 'SELF_MODIFICATION' },
  selfDelete: { message: {{#if DELETE_ACCOUNT}}'Use DELETE /users/me to delete your own account'{{else}}'You cannot delete your own account'{{/if}}, code: 'SELF_MODIFICATION' },
{{/if}}
  emailTaken: { message: 'Email is already registered', code: 'EMAIL_TAKEN' },
} as const satisfies Record<string, string | ErrorMessage>;
