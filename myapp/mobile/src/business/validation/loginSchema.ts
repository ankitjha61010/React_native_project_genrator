import { z } from 'zod';
import type { IntlKey } from '@infrastructure/i18n';

/** Messages are keys of auth.json, rendered by AppInput via `errorValue`. */
const message = (key: IntlKey<'auth'>) => ({ error: key });

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, message('emailRequired'))
    .pipe(z.email(message('emailInvalid'))),
  password: z.string().min(1, message('passwordRequired')).min(6, message('passwordMin')),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
