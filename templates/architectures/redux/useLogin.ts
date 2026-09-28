import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { useForm } from 'react-hook-form';
import { loginSchema, type LoginFormValues } from '{{IMPORT:auth.schema}}';
import type { RootNavigation } from '{{IMPORT:navigation.types}}';
import { selectAuthStatus, useAppDispatch, useAppSelector } from '{{IMPORT:store.index}}';
import { loginThunk } from '{{IMPORT:store.authThunks}}';
import { userMessage } from '{{IMPORT:api.errors}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
import { logger } from '{{IMPORT:utils.logger}}';

/** UI → Action: dispatches `loginThunk`; status is read back through a selector. */
export function {{SYMBOL:auth.logic}}() {
  const navigation = useNavigation<RootNavigation>();
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectAuthStatus);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const submit = form.handleSubmit(async values => {
    try {
      await dispatch(loginThunk(values)).unwrap();
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (error) {
      logger.error('Login failed', error);
      const message = userMessage(error);
      if (message) flash.error({ message });
      else flash.error({ intlType: 'common', value: 'genericError' });
    }
  });

  return { control: form.control, submit, isSubmitting: status === 'loading' };
}
