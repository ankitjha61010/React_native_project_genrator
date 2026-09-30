import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { errorMessage } from '@data/api/apiErrors';
import { authApi } from '@data/api/authApi';
import { useAuthSession } from '@presentation/hooks/useAuthSession';
import type { IntlKey } from '@infrastructure/i18n';
import { flash } from '@utils/flashMessage';

/** Messages are keys of common.json, rendered by AppInput via `errorValue`. */
const message = (key: IntlKey<'common'>) => ({ error: key });

/** Same rules as the backend: 8+ characters with letters and numbers. */
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, message('passwordRequired')),
    newPassword: z
      .string()
      .min(8, message('passwordRules'))
      .regex(/[a-z]/i, message('passwordRules'))
      .regex(/\d/, message('passwordRules')),
    confirmPassword: z.string(),
  })
  .refine(values => values.newPassword === values.confirmPassword, { path: ['confirmPassword'], ...message('passwordsDoNotMatch') });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

/**
 * Change Password screen: validates, the backend checks the current password and stores the
 * new hash. The answer is a new session (the other devices are signed out), which replaces the
 * stored one – this device stays signed in. Resolves true on success.
 */
export function useChangePassword() {
  const { signIn } = useAuthSession();
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    mode: 'onTouched',
  });

  const submit = (onDone: () => void) =>
    form.handleSubmit(async ({ currentPassword, newPassword }) => {
      try {
        await signIn(await authApi.changePassword({ currentPassword, newPassword }));
        flash.success({ intlType: 'common', value: 'passwordChanged' });
        form.reset();
        onDone();
      } catch (error) {
        flash.error({ message: errorMessage(error) });
      }
    });

  return { control: form.control, submit, isSubmitting: form.formState.isSubmitting };
}
