import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { useForm } from 'react-hook-form';
import { errorMessage } from '@data/api/apiErrors';
import { loginSchema, type LoginFormValues } from '@business/validation/loginSchema';
import { authService } from '@business/services/authService';
import { useAuthSession } from '@presentation/hooks/useAuthSession';
import type { RootNavigation } from '@presentation/navigation/navigationTypes';
import { flash } from '@utils/flashMessage';
import { logger } from '@utils/logger';

/** Login form state + submit logic. The screen only renders what this returns. */
export function useLogin() {
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
      // The backend's message, e.g. "Invalid email or password".
      flash.error({ message: errorMessage(error) });
    }
  });

  return { control: form.control, submit, isSubmitting: form.formState.isSubmitting };
}
