import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Video, { ViewType, type OnLoadData, type OnProgressData, type VideoRef } from 'react-native-video';
import { Zoomable } from '@likashefqet/react-native-image-zoom';
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { translate } from '{{IMPORT:i18n.index}}';

export interface ChatVideoPlayerProps {
  uri: string;
  /** Start playing as soon as it is ready. */
  autoPlay?: boolean;
}

/** Controls fade out after this long while playing. */
const CONTROLS_HIDE_MS = 3000;

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Native video player for chat videos (react-native-video – AVPlayer / ExoPlayer, no web view).
 * Pinch or double-tap to zoom, drag to pan while zoomed, tap to show / hide the controls,
 * drag the bar to seek.
 */
export function ChatVideoPlayer({ uri, autoPlay = true }: ChatVideoPlayerProps): React.JSX.Element {
  const videoRef = useRef<VideoRef>(null);
  const [paused, setPaused] = useState(!autoPlay);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [buffering, setBuffering] = useState(true);
  const [failed, setFailed] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [ended, setEnded] = useState(false);

  // Seek bar: its position on screen, and the time under the finger while dragging.
  const barRef = useRef<React.ComponentRef<typeof View>>(null);
  const bar = useRef({ x: 0, width: 1 });
  const [scrubTo, setScrubTo] = useState<number | null>(null);

  useEffect(() => {
    setFailed(false);
    setBuffering(true);
    setPosition(0);
    setEnded(false);
    setPaused(!autoPlay);
  }, [uri, autoPlay]);

  // Hide the controls a moment after playback starts (never while paused or seeking).
  useEffect(() => {
    if (!controlsVisible || paused || scrubTo !== null) return;
    const timer = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_MS);
    return () => clearTimeout(timer);
  }, [controlsVisible, paused, scrubTo]);

  const togglePlay = useCallback(() => {
    if (ended) {
      videoRef.current?.seek(0);
      setEnded(false);
      setPosition(0);
      setPaused(false);
      return;
    }
    setPaused(p => !p);
    setControlsVisible(true);
  }, [ended]);

  const timeAt = (pageX: number) => {
    const ratio = Math.min(1, Math.max(0, (pageX - bar.current.x) / bar.current.width));
    return ratio * duration;
  };

  const onScrub = (event: GestureResponderEvent) => setScrubTo(timeAt(event.nativeEvent.pageX));
  const onScrubEnd = (event: GestureResponderEvent) => {
    const time = timeAt(event.nativeEvent.pageX);
    videoRef.current?.seek(time);
    setPosition(time);
    setEnded(false);
    setScrubTo(null);
  };

  const shownTime = scrubTo ?? position;
  const progress = duration > 0 ? Math.min(1, shownTime / duration) : 0;

  return (
    <View style={styles.container}>
      <Zoomable
        style={styles.zoom}
        minScale={1}
        maxScale={5}
        doubleTapScale={2.5}
        isPinchEnabled
        isPanEnabled
        isDoubleTapEnabled
        isSingleTapEnabled
        onSingleTap={() => setControlsVisible(v => !v)}>
        <Video
          ref={videoRef}
          source={ { uri } }
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          paused={paused}
          // A TextureView can be scaled – needed for pinch-to-zoom on Android.
          viewType={ViewType.TEXTURE}
          ignoreSilentSwitch="ignore"
          playInBackground={false}
          progressUpdateInterval={250}
          shutterColor="transparent"
          onLoad={(data: OnLoadData) => {
            setDuration(data.duration);
            setBuffering(false);
          }}
          onProgress={(data: OnProgressData) => {
            if (scrubTo === null) setPosition(data.currentTime);
          }}
          onBuffer={({ isBuffering }) => setBuffering(isBuffering)}
          onEnd={() => {
            setPaused(true);
            setEnded(true);
            setPosition(duration);
            setControlsVisible(true);
          }}
          onError={() => {
            setFailed(true);
            setBuffering(false);
          }}
        />
      </Zoomable>

      {buffering && !failed ? (
        <View style={styles.center} pointerEvents="none">
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : null}

      {failed ? (
        <View style={styles.center} pointerEvents="none">
{{#if VECTOR_ICONS}}
          <AppIcon name="video-off-outline" size={48} tintColor="#FFFFFF99" />
{{/if}}
          <AppText style={styles.errorText} text={translate('common', 'videoPlaybackFailed')} />
        </View>
      ) : null}

      {controlsVisible && !failed ? (
        <>
          {/* Big play / pause in the middle. */}
          {!buffering ? (
            <View style={styles.center} pointerEvents="box-none">
              <Pressable
                onPress={togglePlay}
                style={styles.bigButton}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={translate('common', paused ? 'play' : 'pause')}>
{{#if VECTOR_ICONS}}
                <AppIcon name={ended ? 'replay' : paused ? 'play' : 'pause'} size={40} tintColor="#FFFFFF" />
{{else}}
                <AppText style={styles.bigButtonText} text={paused ? '▶' : '❚❚'} />
{{/if}}
              </Pressable>
            </View>
          ) : null}

          {/* Time + seek bar. */}
          <View style={styles.bottomBar}>
            <AppText style={styles.time} text={formatTime(shownTime)} />
            <View
              ref={barRef}
              style={styles.seekArea}
              onLayout={() => barRef.current?.measureInWindow((x, _y, width) => (bar.current = { x, width: Math.max(1, width) }))}
              onStartShouldSetResponder={() => duration > 0}
              onMoveShouldSetResponder={() => duration > 0}
              onResponderTerminationRequest={() => false}
              onResponderGrant={onScrub}
              onResponderMove={onScrub}
              onResponderRelease={onScrubEnd}
              onResponderTerminate={() => setScrubTo(null)}
              accessibilityRole="adjustable"
              accessibilityValue={ { min: 0, max: Math.round(duration), now: Math.round(shownTime) } }>
              <View style={styles.track}>
                <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
              </View>
              <View style={[styles.thumb, scrubTo !== null && styles.thumbActive, { left: `${progress * 100}%` }]} />
            </View>
            <AppText style={styles.time} text={formatTime(duration)} />
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  zoom: {
    flex: 1,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  bigButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#00000080',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigButtonText: {
    color: '#FFFFFF',
    fontSize: 28,
  },
  bottomBar: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#00000080',
  },
  time: {
    color: '#FFFFFF',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    minWidth: 38,
    textAlign: 'center',
  },
  seekArea: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF40',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  thumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    marginStart: -7,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
  },
  thumbActive: {
    width: 20,
    height: 20,
    marginStart: -10,
    borderRadius: 10,
  },
});
