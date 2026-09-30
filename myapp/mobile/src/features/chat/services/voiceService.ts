import Sound from 'react-native-nitro-sound';
import { permissionService } from '@infrastructure/permissions/permissionService';

/** A finished recording, ready to upload. */
export interface VoiceRecording {
  uri: string;
  /** Seconds. */
  duration: number;
  fileName: string;
  mimeType: string;
}

/** The recorder answers with a path; uploads and players want a `file://` URI. */
const toUri = (path: string) => (/^(file|content):\/\//.test(path) ? path : `file://${path}`);

let recordingStartedAt = 0;
let recordedSeconds = 0;

/** Stops whatever message is playing (only one plays at a time). */
let stopCurrentPlayback: (() => void) | undefined;

/**
 * Voice messages: record (microphone) and play (one message at a time).
 * react-native-nitro-sound records AAC (.m4a) on both platforms – the backend accepts audio/mp4.
 */
export const voiceService = {
  /**
   * Asks for the microphone (once) and starts recording. `onTick` gets the elapsed seconds.
   * Resolves false when the permission is denied – show a hint to open Settings.
   */
  async startRecording(onTick: (seconds: number) => void): Promise<boolean> {
    if (!(await permissionService.ensure('microphone'))) return false;
    stopCurrentPlayback?.();
    recordedSeconds = 0;
    recordingStartedAt = Date.now();
    Sound.addRecordBackListener(event => {
      recordedSeconds = Math.floor(event.currentPosition / 1000);
      onTick(recordedSeconds);
    });
    await Sound.startRecorder();
    return true;
  },

  /** Stops and returns the recording (null when it was shorter than a second). */
  async stopRecording(): Promise<VoiceRecording | null> {
    const path = await Sound.stopRecorder();
    Sound.removeRecordBackListener();
    const duration = Math.max(recordedSeconds, Math.round((Date.now() - recordingStartedAt) / 1000));
    if (duration < 1) return null;
    return { uri: toUri(path), duration, fileName: `voice-${Date.now()}.m4a`, mimeType: 'audio/mp4' };
  },

  /** Stops without sending. */
  async cancelRecording(): Promise<void> {
    await Sound.stopRecorder().catch(() => undefined);
    Sound.removeRecordBackListener();
  },

  /**
   * Plays a voice message. `onProgress` gets position / duration in seconds; `onEnd` runs when
   * it finishes or another message starts playing.
   */
  async play(uri: string, onProgress: (position: number, duration: number) => void, onEnd: () => void): Promise<void> {
    stopCurrentPlayback?.();
    const finish = () => {
      Sound.removePlayBackListener();
      Sound.removePlaybackEndListener();
      stopCurrentPlayback = undefined;
      onEnd();
    };
    stopCurrentPlayback = () => {
      Sound.stopPlayer().catch(() => undefined);
      finish();
    };
    Sound.addPlayBackListener(event => onProgress(event.currentPosition / 1000, event.duration / 1000));
    Sound.addPlaybackEndListener(finish);
    await Sound.startPlayer(uri);
  },

  pause: () => Sound.pausePlayer(),

  resume: () => Sound.resumePlayer(),

  /** Stops the message that is playing (e.g. when the chat closes). */
  stop(): void {
    stopCurrentPlayback?.();
  },
};
