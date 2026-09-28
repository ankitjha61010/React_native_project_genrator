import { Platform } from 'react-native';
{{#if SOCIAL_GOOGLE}}
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
{{/if}}
{{#if SOCIAL_FACEBOOK}}
import { AccessToken, AuthenticationToken, LoginManager, Profile } from 'react-native-fbsdk-next';
{{/if}}
{{#if SOCIAL_APPLE}}
import { appleAuth } from '@invertase/react-native-apple-authentication';
{{/if}}
{{#if SOCIAL_GOOGLE}}
import { env } from '{{IMPORT:config.env}}';
{{/if}}

/**
 * Social login (native SDKs). Every key is a placeholder until you replace it –
 * see docs/SOCIAL_LOGIN.md for where each value lives and how to get it.
 *
 * The providers only prove who the user is. Send `SocialAuthResult.token` to your
 * backend, verify it there and return your own session (see `authService.socialLogin`).
 */

export type SocialProvider = 'google' | 'facebook' | 'apple';

export interface SocialAuthResult {
  provider: SocialProvider;
  /**
   * Credential to verify on the backend:
   * - google: OpenID Connect ID token (JWT)
   * - facebook: Graph API access token, or an OIDC authentication token (iOS Limited Login)
   * - apple: identity token (JWT)
   */
  token: string;
  tokenType: 'idToken' | 'accessToken' | 'authenticationToken' | 'identityToken';
  /** Apple only: one-time code your backend can exchange for refresh tokens. */
  authorizationCode?: string;
  /** Apple only: nonce embedded in the identity token (verify it on the backend). */
  nonce?: string;
  user: {
    id: string;
    name: string;
    email?: string;
    photoUrl?: string;
  };
}

/** Thrown when the user closes the provider's sign-in UI – not an error to show. */
export class SocialAuthCancelledError extends Error {
  constructor(public readonly provider: SocialProvider) {
    super(`${provider} sign in was cancelled`);
    this.name = 'SocialAuthCancelledError';
  }
}

/** Thrown when a key is still a `YOUR_…` placeholder. */
export class SocialAuthNotConfiguredError extends Error {
  constructor(provider: SocialProvider, what: string) {
    super(`${provider} login is not configured: set ${what} (see docs/SOCIAL_LOGIN.md).`);
    this.name = 'SocialAuthNotConfiguredError';
  }
}

{{#if SOCIAL_GOOGLE}}
// ── Google ────────────────────────────────────────────────────────────────────

const isPlaceholder = (value: string | undefined) => !value || value.includes('YOUR_');

let googleConfigured = false;

function configureGoogle(): void {
  if (googleConfigured) return;
  if (isPlaceholder(env.google.webClientId)) {
    throw new SocialAuthNotConfiguredError('google', 'GOOGLE_WEB_CLIENT_ID in .env');
  }
  if (Platform.OS === 'ios' && isPlaceholder(env.google.iosClientId)) {
    throw new SocialAuthNotConfiguredError('google', 'GOOGLE_IOS_CLIENT_ID in .env');
  }
  GoogleSignin.configure({
    // The web client id makes Google return an ID token your backend can verify.
    webClientId: env.google.webClientId,
    iosClientId: env.google.iosClientId || undefined,
    scopes: ['profile', 'email'],
  });
  googleConfigured = true;
}

async function signInWithGoogle(): Promise<SocialAuthResult> {
  configureGoogle();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      throw new SocialAuthCancelledError('google');
    }
    const { user, idToken } = response.data;
    if (!idToken) {
      throw new Error('Google did not return an ID token – check GOOGLE_WEB_CLIENT_ID.');
    }
    return {
      provider: 'google',
      token: idToken,
      tokenType: 'idToken',
      user: {
        id: user.id,
        name: user.name ?? user.email,
        email: user.email,
        photoUrl: user.photo ?? undefined,
      },
    };
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS) {
        throw new SocialAuthCancelledError('google');
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services are not available on this device.');
      }
    }
    throw error;
  }
}
{{/if}}

{{#if SOCIAL_FACEBOOK}}
// ── Facebook ──────────────────────────────────────────────────────────────────

async function signInWithFacebook(): Promise<SocialAuthResult> {
  const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
  if (result.isCancelled) {
    throw new SocialAuthCancelledError('facebook');
  }

  const profile = await Profile.getCurrentProfile();
  const user = {
    id: profile?.userID ?? '',
    name: profile?.name ?? 'Facebook user',
    email: profile?.email ?? undefined,
    photoUrl: profile?.imageURL ?? undefined,
  };

  const accessToken = await AccessToken.getCurrentAccessToken();
  if (accessToken) {
    return { provider: 'facebook', token: accessToken.accessToken, tokenType: 'accessToken', user };
  }

  // iOS Limited Login (the user did not allow App Tracking Transparency): Facebook only
  // issues an OpenID Connect token. Verify it on the backend like a Google ID token.
  if (Platform.OS === 'ios') {
    const authToken = await AuthenticationToken.getAuthenticationTokenIOS();
    if (authToken) {
      return { provider: 'facebook', token: authToken.authenticationToken, tokenType: 'authenticationToken', user };
    }
  }
  throw new Error('Facebook did not return a token.');
}
{{/if}}

{{#if SOCIAL_APPLE}}
// ── Apple ─────────────────────────────────────────────────────────────────────

/** Sign in with Apple is offered on iOS 13+ only. */
const isAppleSupported = Platform.OS === 'ios' && appleAuth.isSupported;

async function signInWithApple(): Promise<SocialAuthResult> {
  if (!isAppleSupported) {
    throw new Error('Sign in with Apple is only available on iOS 13 or newer.');
  }
  try {
    const response = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      // FULL_NAME must come first, otherwise Apple may not return the name.
      requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
    });
    if (!response.identityToken) {
      throw new Error('Apple did not return an identity token.');
    }
    // Apple sends the name and email only the FIRST time a user signs in to your app –
    // store them on your backend.
    const name = [response.fullName?.givenName, response.fullName?.familyName].filter(Boolean).join(' ');
    return {
      provider: 'apple',
      token: response.identityToken,
      tokenType: 'identityToken',
      authorizationCode: response.authorizationCode ?? undefined,
      nonce: response.nonce,
      user: {
        id: response.user,
        name: name || 'Apple user',
        email: response.email ?? undefined,
      },
    };
  } catch (error) {
    if ((error as { code?: string }).code === appleAuth.Error.CANCELED) {
      throw new SocialAuthCancelledError('apple');
    }
    throw error;
  }
}
{{/if}}

export const socialAuthService = {
{{#if SOCIAL_APPLE}}
  /** Whether to show the Sign in with Apple button on this device. */
  isAppleSupported,

{{/if}}
  async signIn(provider: SocialProvider): Promise<SocialAuthResult> {
    switch (provider) {
{{#if SOCIAL_GOOGLE}}
      case 'google':
        return signInWithGoogle();
{{/if}}
{{#if SOCIAL_FACEBOOK}}
      case 'facebook':
        return signInWithFacebook();
{{/if}}
{{#if SOCIAL_APPLE}}
      case 'apple':
        return signInWithApple();
{{/if}}
      default:
        throw new Error(`${provider} login is not enabled in this app.`);
    }
  },

  /** Signs out of every provider SDK (your own session is cleared by useAuthSession). */
  async signOut(): Promise<void> {
{{#if SOCIAL_GOOGLE}}
    if (googleConfigured) {
      await GoogleSignin.signOut().catch(() => undefined);
    }
{{/if}}
{{#if SOCIAL_FACEBOOK}}
    LoginManager.logOut();
{{/if}}
    // Apple has no SDK session to clear.
  },
};
