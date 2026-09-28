import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { useForm } from 'react-hook-form';
import { authRepository } from '{{IMPORT:auth.service}}';
import { createLoginUseCase } from '{{IMPORT:domain.loginUseCase}}';
import { useAuthSession } from '{{IMPORT:hooks.useAuthSession}}';
import type { RootNavigation } from '{{IMPORT:navigation.types}}';
import { userMessage } from '{{IMPORT:api.errors}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
import { logger } from '{{IMPORT:utils.logger}}';
import { loginSchema, type LoginFormValues } from '{{IMPORT:auth.schema}}';

// Composition root for this use case: the domain gets its data implementation here.
const loginUseCase = createLoginUseCase(authRepository);

/** Presentation logic for the login screen. Calls the use case, never the repository. */
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
      const session = await loginUseCase(values);
      await signIn(session);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (error) {
      logger.error('Login failed', error);
      const message = userMessage(error);
      if (message) flash.error({ message });
      else flash.error({ intlType: 'common', value: 'genericError' });
    }
  });

  return { control: form.control, submit, isSubmitting: form.formState.isSubmitting };
}
