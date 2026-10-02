// ─── Agora Calling Service ────────────────────────────────────────────────────
// Manages the Agora RTC engine, channel joining, audio/video toggling,
// speaker switching, and video rendering.
// Token is ALWAYS fetched from the backend – never hard-coded here.
// ─────────────────────────────────────────────────────────────────────────────

import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  type IRtcEngine,
  type IRtcEngineEventHandler,
} from 'react-native-agora';
import InCallManager from 'react-native-incall-manager';
import type { AgoraTokenResult } from '../types/calling.types';

let engine: IRtcEngine | null = null;

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
): Promise<void> {
  if (!engine) throw new Error('[Agora] Engine not initialised.');
  engine.registerEventHandler(eventHandler);
  engine.enableAudio();
  if (enableVideo) {
    engine.enableVideo();
    engine.startPreview();
  }
  engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
  await engine.joinChannel(tokenResult.token, tokenResult.channelName, tokenResult.uid, {});
  InCallManager.start({ media: enableVideo ? 'video' : 'audio' });
  InCallManager.setKeepScreenOn(true);
}

export async function leaveChannel(eventHandler: IRtcEngineEventHandler): Promise<void> {
  if (!engine) return;
  await engine.leaveChannel();
  engine.unregisterEventHandler(eventHandler);
  InCallManager.setKeepScreenOn(false);
  InCallManager.stop();
}

// ─── Audio controls ────────────────────────────────────────────────────────────

export function muteLocalAudio(muted: boolean): void {
  engine?.muteLocalAudioStream(muted);
}

export function setSpeaker(enabled: boolean): void {
  engine?.setEnableSpeakerphone(enabled);
  InCallManager.setSpeakerphoneOn(enabled);
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
