import { Column, type ColumnOptions } from 'typeorm';

// Column types are always explicit: the app runs with tsx / Vitest, which don't emit
// decorator type metadata.
{{#if POSTGRES}}
export const TIMESTAMP = 'timestamptz';
export const JSON_TYPE = 'jsonb';
{{else}}
export const TIMESTAMP = 'datetime';
export const JSON_TYPE = 'json';
{{/if}}

/** A uuid column ({{#if POSTGRES}}PostgreSQL `uuid`{{else}}MySQL `char(36)`{{/if}}). */
export const UuidColumn = (options: ColumnOptions = {}) => Column({ {{#if POSTGRES}}type: 'uuid'{{else}}type: 'char', length: 36{{/if}}, ...options });
