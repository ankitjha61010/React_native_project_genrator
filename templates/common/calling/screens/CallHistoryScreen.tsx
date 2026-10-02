// ─── Call History Screen ──────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { clearCallHistory, deleteCallLog, getCallHistory } from '../callingEndpoints';
import { errorMessage } from '{{IMPORT:api.errors}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
import { useAuthSession } from '{{IMPORT:hooks.useAuthSession}}';
import type { Call } from '../types/calling.types';
import { useCallContext } from '../context/CallContext';
import { AppIcon, type AppIconName } from '{{IMPORT:components.AppIcon}}';

interface CallItemProps {
  call: Call;
  currentUserId: string;
  onCallBack?: (userId: string, callType: Call['callType'], name: string) => void;
  onDelete: (call: Call) => void;
}

type FilterType = 'all' | 'missed' | 'received' | 'outgoing';

function CallItem({ call, currentUserId, onCallBack, onDelete }: CallItemProps) {
  const isOutgoing = call.callerId === currentUserId;
  const isMissed = !isOutgoing && (call.status === 'missed' || call.status === 'declined' || call.status === 'cancelled' || !call.duration);
  const isReceived = !isOutgoing && !isMissed;

  const duration = call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : null;
  const directionIcon: AppIconName = isOutgoing ? 'phone-outgoing' : isMissed ? 'phone-missed' : 'phone-incoming';
  const directionColor = isMissed ? '#ef4444' : isOutgoing ? '#6366f1' : '#22c55e';
  const statusLabel = isMissed ? 'Missed' : isOutgoing ? 'Outgoing' : 'Received';
  const date = new Date(call.createdAt);
  const dateLabel = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const displayId = isOutgoing ? (call.receiverId ?? '?') : call.callerId;
  // The other person: whom I called, or who called me.
  const peer = isOutgoing ? call.receiver : call.caller;
  const displayName = call.isGroupCall ? 'Group call' : (peer?.name ?? 'Unknown');

  return (
    <TouchableOpacity
      style={styles.callItem}
      // Tap: call that person again. A group call can't be redialled from here.
      onPress={() => onCallBack?.(displayId, call.callType, displayName)}
      disabled={call.isGroupCall}
      onLongPress={() => onDelete(call)}
      activeOpacity={0.7}
      accessibilityLabel={`${statusLabel} ${call.callType} call, ${displayName}`}
    >
      {/* Direction & type icon */}
      <View style={[styles.iconWrapper, { backgroundColor: `${directionColor}22` }]}>
        <AppIcon name={call.callType === 'video' ? 'video' : directionIcon} size={20} tintColor={directionColor} />
      </View>

      {/* Info */}
      <View style={styles.callInfo}>
        <Text style={styles.callId} numberOfLines={1}>{displayName}</Text>
        <Text style={[styles.statusText, isMissed ? styles.missedText : isReceived ? styles.receivedText : styles.outgoingText]}>
          {statusLabel}
          {call.isGroupCall ? ' (group)' : ''}
          {duration ? ` • ${duration}` : ''}
        </Text>
      </View>

      {/* Date */}
      <View style={styles.dateWrapper}>
        <Text style={styles.dateText}>{dateLabel}</Text>
        <Text style={styles.timeText}>{timeLabel}</Text>
      </View>

      <TouchableOpacity
        onPress={() => onDelete(call)}
        style={styles.deleteBtn}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Delete call from history"
      >
        <AppIcon name="delete-outline" size={22} tintColor="rgba(255,255,255,0.5)" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

interface Props {
  currentUserId?: string;
  onCallBack?: (userId: string, callType: Call['callType'], name: string) => void;
}

export function CallHistoryScreen({ currentUserId: propUserId, onCallBack }: Props) {
  const { user } = useAuthSession();
  const currentUserId = propUserId ?? user?.id ?? '';
  const { startCall } = useCallContext();
  // Tap a call: call that person again (the same kind of call), unless the parent handles it.
  const callBack = useCallback(
    (userId: string, callType: Call['callType'], name: string) => {
      if (onCallBack) return onCallBack(userId, callType, name);
      startCall(userId, {{#if VIDEO_CALL}}callType{{else}}'audio'{{/if}}, name);
    },
    [onCallBack, startCall],
  );
  const [calls, setCalls] = useState<Call[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  const load = useCallback(async (reset = false) => {
    const off = reset ? 0 : offset;
    try {
      const data = await getCallHistory(LIMIT, off);
      const callList = data?.calls || [];
      if (reset) {
        setCalls(callList);
        setOffset(LIMIT);
      } else {
        setCalls(prev => [...prev, ...callList]);
        setOffset(off + LIMIT);
      }
      setTotal(data?.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [offset]);

  useEffect(() => { load(true); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const filteredCalls = React.useMemo(() => {
    return calls.filter(c => {
      const isOutgoing = c.callerId === currentUserId;
      const isMissed = !isOutgoing && (c.status === 'missed' || c.status === 'declined' || c.status === 'cancelled' || !c.duration);
      const isReceived = !isOutgoing && !isMissed;
      if (filter === 'missed') return isMissed;
      if (filter === 'received') return isReceived;
      if (filter === 'outgoing') return isOutgoing;
      return true;
    });
  }, [calls, filter, currentUserId]);

  // Removes the call from my history only – the other person keeps it.
  const removeCall = useCallback((call: Call) => {
    Alert.alert('Delete call', 'Remove this call from your call history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCallLog(call.id);
            setCalls(prev => prev.filter(c => c.id !== call.id));
            setTotal(t => Math.max(0, t - 1));
          } catch (error) {
            flash.error({ message: errorMessage(error) });
          }
        },
      },
    ]);
  }, []);

  const clearAll = useCallback(() => {
    Alert.alert('Clear call history', 'Remove all calls from your call history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearCallHistory();
            setCalls([]);
            setTotal(0);
            setOffset(0);
          } catch (error) {
            flash.error({ message: errorMessage(error) });
          }
        },
      },
    ]);
  }, []);

  const onEndReached = () => {
    if (calls.length < total) load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={filteredCalls.length === 0 && styles.emptyContainer}
      data={filteredCalls}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <CallItem call={item} currentUserId={currentUserId} onCallBack={callBack} onDelete={removeCall} />
      )}
      ListHeaderComponent={
        <View>
          <View style={styles.filterBar}>
            {(['all', 'missed', 'received', 'outgoing'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.filterTab, filter === tab && styles.filterTabActive]}
                onPress={() => setFilter(tab)}>
                <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {filteredCalls.length > 0 ? (
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Recent</Text>
              <TouchableOpacity onPress={clearAll} accessibilityRole="button" accessibilityLabel="Clear call history">
                <Text style={styles.clearAll}>Clear all</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <AppIcon name="phone-outline" size={48} tintColor="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyText}>No {filter === 'all' ? '' : filter + ' '}calls found</Text>
        </View>
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#0a0e1a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0e1a' },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 16, color: 'rgba(255,255,255,0.4)' },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 14,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callInfo: { flex: 1 },
  callId: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 3 },
  statusText: { fontSize: 13, color: 'rgba(255,255,255,0.45)' },
  missedText: { color: '#ef4444' },
  receivedText: { color: '#22c55e' },
  outgoingText: { color: '#818cf8' },
  dateWrapper: { alignItems: 'flex-end' },
  dateText: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  timeText: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  deleteBtn: { padding: 4 },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: '#6366f1',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
  },
  filterTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' },
  clearAll: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
});
