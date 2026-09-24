import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { useForm } from 'react-hook-form';
import { loginSchema, type LoginFormValues } from '{{IMPORT:auth.schema}}';
import { authService } from '{{IMPORT:auth.service}}';
import { useAuthSession } from '{{IMPORT:hooks.useAuthSession}}';
import type { RootNavigation } from '{{IMPORT:navigation.types}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
import { logger } from '{{IMPORT:utils.logger}}';

/** Login form state + submit logic. The screen only renders what this returns. */
export function {{SYMBOL:auth.logic}}() {
  const navigation = useNavigation<RootNavigation>();
  const { signIn } = useAuthSession();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const submit = form.handleSubmit(async values => {
    try {
      const session = await authService.login(values);
      await signIn(session);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (error) {
      logger.error('Login failed', error);
      flash.error({ intlType: 'common', value: 'genericError' });
    }
  });

  return { control: form.control, submit, isSubmitting: form.formState.isSubmitting };
}
