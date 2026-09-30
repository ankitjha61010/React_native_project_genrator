import { useCallback, useState } from 'react';
import { errorMessage } from '@data/api/apiErrors';
import { userApi, type LocalFile, type ProfileChanges } from '@data/api/userApi';
import { useAuthSession } from '@presentation/hooks/useAuthSession';
import { flash } from '@utils/flashMessage';

/**
 * The signed-in user's profile: Profile / Edit Profile screens.
 *
 * Every change goes Backend → the whole updated user → `updateUser` (state + storage), so the
 * new data shows on every screen at once – the user is never cleared or re-fetched.
 */
export function useProfile() {
  const { user, updateUser, signOut } = useAuthSession();
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  /** Edit Profile → Save: the fields, then the newly picked photo (if any). Resolves true on success. */
  const saveProfile = useCallback(
    async (changes: ProfileChanges, avatar?: LocalFile | null): Promise<boolean> => {
      setSaving(true);
      try {
        let updated = await userApi.updateProfile(changes);
        if (avatar) updated = await userApi.uploadAvatar(avatar);
        await updateUser(updated);
        flash.success({ intlType: 'common', value: 'saved' });
        return true;
      } catch (error) {
        flash.error({ message: errorMessage(error) });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [updateUser],
  );

  /** Uploads a new profile photo right away (Profile screen). */
  const changeAvatar = useCallback(
    async (image: LocalFile): Promise<boolean> => {
      setUploadingAvatar(true);
      try {
        await updateUser(await userApi.uploadAvatar(image));
        return true;
      } catch (error) {
        flash.error({ message: errorMessage(error) });
        return false;
      } finally {
        setUploadingAvatar(false);
      }
    },
    [updateUser],
  );

  /**
   * Deletes the account on the backend (DELETE /users/me), then clears everything local:
   * tokens, user, device id registration, socket. The screen asks for confirmation first and
   * navigates to the login screen afterwards. Resolves true on success.
   */
  const deleteAccount = useCallback(async (): Promise<boolean> => {
    setDeletingAccount(true);
    try {
      await userApi.deleteAccount();
      // The account (and its sessions / devices) no longer exist – nothing to revoke on the server.
      await signOut({ server: false });
      flash.success({ intlType: 'common', value: 'accountDeleted' });
      return true;
    } catch (error) {
      flash.error({ message: errorMessage(error) });
      return false;
    } finally {
      setDeletingAccount(false);
    }
  }, [signOut]);

  return {
    user,
    saving,
    uploadingAvatar,
    saveProfile,
    changeAvatar,
    deletingAccount,
    deleteAccount,
  };
}
