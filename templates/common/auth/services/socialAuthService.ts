/**
 * Placeholder keys & config for Google / Facebook OAuth.
 * Replace with your actual credentials from Google Cloud Console & Meta Developer Portal.
 */
export const SOCIAL_AUTH_CONFIG = {
  google: {
    webClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',
    iosClientId: 'YOUR_GOOGLE_IOS_CLIENT_ID.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
  },
  facebook: {
    appId: 'YOUR_FACEBOOK_APP_ID',
    appName: '{{DISPLAY_NAME}}',
    permissions: ['public_profile', 'email'],
  },
} as const;

export interface SocialUser {
  id: string;
  name: string;
  email?: string;
  photoUrl?: string;
  provider: 'google' | 'facebook';
  accessToken: string;
}

/**
 * Social Auth Service wrapper.
 * Configure third party SDKs (@react-native-google-signin/google-signin or react-native-fbsdk-next)
 * when you are ready to link native SDKs.
 */
export const socialAuthService = {
  async signInWithGoogle(): Promise<SocialUser> {
    // In demo / starter mode, return simulated verified credential.
    // Replace with GoogleSignin.signIn() after installing @react-native-google-signin/google-signin.
    return {
      id: 'google_dummy_user_123',
      name: 'Google User',
      email: 'user@google.com',
      photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      provider: 'google',
      accessToken: 'dummy_google_access_token',
    };
  },

  async signInWithFacebook(): Promise<SocialUser> {
    // In demo / starter mode, return simulated verified credential.
    // Replace with LoginManager.logInWithPermissions() after installing react-native-fbsdk-next.
    return {
      id: 'facebook_dummy_user_456',
      name: 'Facebook User',
      email: 'user@facebook.com',
      photoUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      provider: 'facebook',
      accessToken: 'dummy_facebook_access_token',
    };
  },

  async signOut(): Promise<void> {
    // Sign out logic
  },
};
