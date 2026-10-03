// ─── Agora Calling Service ────────────────────────────────────────────────────
// Manages the Agora RTC engine, channel joining, audio/video toggling,
// speaker switching, and video rendering.
// Token is ALWAYS fetched from the backend – never hard-coded here.
// ─────────────────────────────────────────────────────────────────────────────

import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  ErrorCodeType,
  type IRtcEngine,
  type IRtcEngineEventHandler,
} from 'react-native-agora';
import InCallManager from 'react-native-incall-manager';
import type { AgoraTokenResult } from '../types/calling.types';

let engine: IRtcEngine | null = null;
/**
 * iOS CallKit call: CallKit owns the audio session (it activates it after the answer). InCallManager must not
 * touch it – its start()/stop() activate and deactivate the session themselves, and iOS then ends the call.
 */
let systemManagedAudio = false;

// ─── Lifecycle ────────────────────────────────────────────────────────────────

export function initAgoraEngine(appId: string): IRtcEngine {
  if (engine) return engine;
  engine = createAgoraRtcEngine();
  engine.initialize({ appId, channelProfile: ChannelProfileType.ChannelProfileCommunication });
  engine.setDefaultAudioRouteToSpeakerphone(false);
  return engine;
}

export function destroyAgoraEngine(): void {
  engine?.release();
  engine = null;
}

export function getEngine(): IRtcEngine | null {
  return engine;
}

// ─── Join & Leave ─────────────────────────────────────────────────────────────

export async function joinChannel(
  tokenResult: AgoraTokenResult,
  enableVideo: boolean,
  eventHandler: IRtcEngineEventHandler,
  options?: { systemManagedAudio?: boolean },
): Promise<void> {
  if (!engine) throw new Error('[Agora] Engine not initialised.');
  systemManagedAudio = Boolean(options?.systemManagedAudio);
  engine.registerEventHandler(eventHandler);
  engine.enableAudio();
  if (enableVideo) {
    engine.enableVideo();
    engine.startPreview();
  }
  engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
  const join = () => engine!.joinChannel(tokenResult.token, tokenResult.channelName, tokenResult.uid, {});
  let code = join();
  // Still in an earlier call's channel (Agora allows one): leave it, then join this one. Before, the refusal was
  // ignored – the app stayed alone in the old channel while everyone else was in the new one.
  if (code === -ErrorCodeType.ErrJoinChannelRejected) {
    engine.leaveChannel();
    code = join();
  }
  if (code < 0) throw new Error(`Could not join the call (Agora error ${-code}).`);
  if (!systemManagedAudio) InCallManager.start({ media: enableVideo ? 'video' : 'audio' });
  InCallManager.setKeepScreenOn(true);
}

export async function leaveChannel(eventHandler: IRtcEngineEventHandler): Promise<void> {
  if (!engine) return;
  await engine.leaveChannel();
  engine.unregisterEventHandler(eventHandler);
  InCallManager.setKeepScreenOn(false);
  if (!systemManagedAudio) InCallManager.stop();
  systemManagedAudio = false;
}

// ─── Audio controls ────────────────────────────────────────────────────────────

export function muteLocalAudio(muted: boolean): void {
  engine?.muteLocalAudioStream(muted);
}

export function setSpeaker(enabled: boolean): void {
  engine?.setEnableSpeakerphone(enabled);
  if (!systemManagedAudio) InCallManager.setSpeakerphoneOn(enabled);
}

// ─── Video controls ────────────────────────────────────────────────────────────

export function muteLocalVideo(muted: boolean): void {
  engine?.muteLocalVideoStream(muted);
}

export function switchCamera(): void {
  engine?.switchCamera();
}

// ─── In-call tones ─────────────────────────────────────────────────────────────

export function startRingback(): void {
  InCallManager.startRingback('_DEFAULT_');
}

export function stopRingback(): void {
  InCallManager.stopRingback();
}

export function startRingtone(): void {
  InCallManager.startRingtone('_DEFAULT_', 0, 'playback', 30);
}

export function stopRingtone(): void {
  InCallManager.stopRingtone();
}
