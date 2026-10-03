/*
 * {{DISPLAY_NAME}} realtime tester – plain browser JavaScript, no build step.
 * Talks to the real REST API (same envelope{{#if API_ENCRYPTION}} and encryption{{/if}} as the app) and the Socket.IO server.
 * Each browser tab keeps its own session (sessionStorage): sign in as user A in one tab and user B in another.
 */
(() => {
  'use strict';

  // Opened from disk (file://): the API, Socket.IO and the page's config only exist on the running server.
  if (location.protocol === 'file:') {
    location.replace('http://localhost:{{PORT}}/tester/');
    return;
  }

  const $ = id => document.getElementById(id);
  const TOKEN_KEY = 'tester.accessToken';

  const state = {
    apiBase: '/api/v1',
    encryption: null,
    token: null,
    me: null,
    socket: null,
    target: null,
{{#if CHAT}}
    conversation: null,
    messages: new Map(),
    typingTimer: null,
    isTyping: false,
{{/if}}
{{#if CALLING}}
    call: null,
    incoming: null,
    agora: null,
    tracks: { mic: null, cam: null },
    timer: null,
    connectedAt: 0,
{{/if}}
  };

  // ── log ──────────────────────────────────────────────────────────────────────

  function log(kind, text, data) {
    const line = document.createElement('div');
    line.className = kind;
    const time = new Date().toLocaleTimeString();
    line.textContent = `${time}  ${text}${data === undefined ? '' : '  ' + JSON.stringify(data)}`;
    const box = $('log');
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  function fail(error) {
    log('err', `✖ ${error.message || error}`);
  }

  /** Runs an async click handler and logs its error. */
  const safe = fn => (...args) => Promise.resolve(fn(...args)).catch(fail);

{{#if API_ENCRYPTION}}
  // ── encryption (AES-256-CBC, like the app's apiEncryption.ts) ──────────────────

  function cipherParams() {
    return {
      key: CryptoJS.enc.Utf8.parse(state.encryption.key),
      options: { iv: CryptoJS.enc.Utf8.parse(state.encryption.iv), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 },
    };
  }

  function encrypt(value) {
    const { key, options } = cipherParams();
    return CryptoJS.AES.encrypt(JSON.stringify(value), key, options).toString();
  }

  function decrypt(base64) {
    const { key, options } = cipherParams();
    return JSON.parse(CryptoJS.AES.decrypt(base64, key, options).toString(CryptoJS.enc.Utf8));
  }

{{/if}}
  // ── REST ─────────────────────────────────────────────────────────────────────

  /** Calls the API and returns the envelope `{ success, message, data, meta }` (throws on errors). */
  async function api(method, path, body) {
    const headers = {};
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    let payload;
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
{{#if API_ENCRYPTION}}
      payload = JSON.stringify(state.encryption ? { data: encrypt(body) } : body);
{{else}}
      payload = JSON.stringify(body);
{{/if}}
    }
    const response = await fetch(state.apiBase + path, { method, headers, body: payload });
    let json = null;
    try {
      json = await response.json();
    } catch {
      // empty / non-JSON body
    }
{{#if API_ENCRYPTION}}
    if (json && state.encryption && typeof json.data === 'string' && !('success' in json)) json = decrypt(json.data);
{{/if}}
    if (!response.ok || !json || json.success === false) {
      log('err', `${method} ${path} → ${response.status}`, json ?? undefined);
      if (response.status === 401 && state.token) log('err', 'Access token rejected or expired – sign in again.');
      throw new Error(json?.message || `HTTP ${response.status}`);
    }
    log('out', `${method} ${path} → ${response.status}`);
    return json;
  }

  // ── session ──────────────────────────────────────────────────────────────────

{{#if !AUTH_API}}
  /** The `sub` claim of a JWT (the user id) – no verification, the server does that. */
  function tokenSubject(token) {
    try {
      const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(part)).sub ?? null;
    } catch {
      return null;
    }
  }

{{/if}}
  async function signIn(token) {
    state.token = token.trim().replace(/^Bearer\s+/i, '');
{{#if AUTH_API}}
    const { data } = await api('GET', '/auth/me');
    state.me = { id: data.id, name: data.name || data.email || data.id };
{{else}}
    const id = tokenSubject(state.token);
    if (!id) throw new Error('Not a JWT access token');
    state.me = { id, name: id };
{{/if}}
    try {
      sessionStorage.setItem(TOKEN_KEY, state.token);
    } catch {
      // storage blocked – the session lasts until reload
    }
    $('meName').textContent = state.me.name;
    $('meId').textContent = state.me.id;
    $('signedOut').hidden = true;
    $('signedIn').hidden = false;
    log('out', `Signed in as ${state.me.name} (${state.me.id})`);
    connectSocket();
{{#if CHAT}}
    loadConversations().catch(fail);
{{/if}}
{{#if USERS_API}}
    searchUsers().catch(fail);
{{/if}}
  }

  function signOut() {
    state.socket?.disconnect();
    state.socket = null;
    state.token = null;
    state.me = null;
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
{{#if CALLING}}
    resetCall('signed out');
{{/if}}
    $('signedOut').hidden = false;
    $('signedIn').hidden = true;
    log('out', 'Signed out');
  }

{{#if AUTH_EMAIL}}
  async function login(event) {
    event.preventDefault();
    const { data } = await api('POST', '/auth/login', { email: $('loginEmail').value.trim(), password: $('loginPassword').value });
    await signIn(data.tokens.accessToken);
  }

{{/if}}
  // ── socket ───────────────────────────────────────────────────────────────────

  /** What each incoming socket event does on this page (everything is logged anyway). */
  const handlers = {};

  function setSocketState(connected, text) {
    $('socketDot').classList.toggle('on', connected);
    $('socketState').textContent = `socket: ${text}`;
  }

  function connectSocket() {
    state.socket?.disconnect();
    // Same origin as the API; the server only accepts the websocket transport.
    const socket = io({ auth: { token: state.token }, transports: ['websocket'] });
    socket.on('connect', () => {
      setSocketState(true, `connected (${socket.id})`);
      log('in', '⇠ connect');
{{#if CHAT}}
      if (state.conversation) joinRoom(state.conversation.id);
{{/if}}
    });
    socket.on('disconnect', reason => {
      setSocketState(false, `disconnected (${reason})`);
      log('err', `⇠ disconnect: ${reason}`);
    });
    socket.on('connect_error', error => {
      setSocketState(false, 'error');
      log('err', `⇠ connect_error: ${error.message}`);
    });
    socket.onAny((event, payload) => {
      log('in', `⇠ ${event}`, payload);
      const handler = handlers[event];
      if (handler) Promise.resolve(handler(payload)).catch(fail);
    });
    state.socket = socket;
  }

  function emit(event, payload) {
    if (!state.socket?.connected) return log('err', `socket not connected – ${event} not sent`);
    log('out', `⇢ ${event}`, payload);
    state.socket.emit(event, payload, ack => {
      if (ack !== undefined) log(ack?.ok === false ? 'err' : 'in', `⇠ ack ${event}`, ack);
    });
  }

  // ── the other user ───────────────────────────────────────────────────────────

  function setTarget(user) {
    state.target = user;
    $('targetLabel').textContent = user ? `${user.name || user.id} (${user.id})` : 'nobody';
    for (const li of document.querySelectorAll('#userList li')) li.classList.toggle('active', li.dataset.id === user?.id);
  }

  function requireTarget() {
    if (!state.target) throw new Error('Pick the other user first (step 2)');
    return state.target;
  }

{{#if USERS_API}}
  async function searchUsers() {
    const search = $('userSearch').value.trim();
    const query = new URLSearchParams({ page: '1', limit: '20', ...(search ? { search } : {}) });
    const { data } = await api('GET', `/users/search?${query}`);
    const list = $('userList');
    list.replaceChildren();
    for (const user of data) {
      const li = document.createElement('li');
      li.dataset.id = user.id;
      li.innerHTML = '<span></span><span class="meta"></span>';
      li.children[0].textContent = user.name || '(no name)';
      li.children[1].textContent = user.email || user.phone || user.id;
      li.addEventListener('click', () => setTarget(user));
      list.appendChild(li);
    }
    if (!data.length) list.innerHTML = '<li class="meta">No other users – register a second account.</li>';
  }

{{/if}}
{{#if CHAT}}
  // ── chat ─────────────────────────────────────────────────────────────────────

  async function loadConversations() {
    const { data } = await api('GET', '/chat/conversations');
    const list = $('conversationList');
    list.replaceChildren();
    for (const conversation of data) {
      const li = document.createElement('li');
      li.dataset.id = conversation.id;
      li.classList.toggle('active', conversation.id === state.conversation?.id);
      li.innerHTML = '<span></span><span class="meta"></span>';
      li.children[0].textContent = conversation.title + (conversation.isGroup ? ' 👥' : '');
      li.children[1].textContent = conversation.unreadCount ? `${conversation.unreadCount} unread` : messagePreview(conversation.lastMessage);
      li.addEventListener('click', safe(() => openConversation(conversation)));
      list.appendChild(li);
    }
    if (!data.length) list.innerHTML = '<li class="meta">No conversations yet.</li>';
  }

  async function startChat() {
    const target = requireTarget();
    const { data } = await api('POST', '/chat/conversations', { participantIds: [target.id] });
    await openConversation(data);
    await loadConversations();
  }

  function joinRoom(conversationId) {
    emit('chat:join_room', { roomId: conversationId });
  }

  async function openConversation(conversation) {
    if (state.conversation && state.conversation.id !== conversation.id) emit('chat:leave_room', { roomId: state.conversation.id });
    state.conversation = conversation;
    state.messages = new Map();
    $('chatBox').hidden = false;
    $('chatTitle').textContent = conversation.title;
    $('typingIndicator').textContent = '';
    $('messages').replaceChildren();
    for (const li of document.querySelectorAll('#conversationList li')) li.classList.toggle('active', li.dataset.id === conversation.id);
    joinRoom(conversation.id);
    const { data } = await api('GET', `/chat/conversations/${conversation.id}/messages?limit=30`);
    for (const message of data) addMessage(message);
    await markRead();
  }

  async function loadOlder() {
    if (!state.conversation) return;
    const oldest = [...state.messages.values()][0];
    if (!oldest) return;
    const { data, meta } = await api('GET', `/chat/conversations/${state.conversation.id}/messages?limit=30&before=${encodeURIComponent(oldest.id)}`);
    const current = [...state.messages.values()];
    state.messages = new Map();
    for (const message of [...data, ...current]) state.messages.set(message.id, message);
    renderMessages();
    if (meta && meta.hasMore === false) log('out', 'No older messages');
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!state.conversation) throw new Error('Open a conversation first');
    const input = $('messageInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    stopTyping();
    const { data } = await api('POST', `/chat/conversations/${state.conversation.id}/messages`, { type: 'text', text });
    addMessage(data);
  }

  async function markRead() {
    if (state.conversation) await api('POST', `/chat/conversations/${state.conversation.id}/read`);
  }

  function messagePreview(message) {
    if (!message) return '';
    if (message.type === 'text') return message.text ?? '';
    if (message.type === 'system') return message.event ?? 'system';
    return `[${message.type}] ${message.fileName ?? ''}`;
  }

  function addMessage(message) {
    state.messages.set(message.id, message);
    renderMessages();
  }

  function renderMessages() {
    const box = $('messages');
    box.replaceChildren();
    for (const message of state.messages.values()) {
      const mine = message.senderId === state.me?.id;
      const bubble = document.createElement('div');
      bubble.className = `bubble${message.type === 'system' ? ' system' : mine ? ' me' : ''}`;
      const text = document.createElement('span');
      text.textContent = message.type === 'text' ? message.text : messagePreview(message) + (message.mediaUrl ? ` ${message.mediaUrl}` : '');
      const meta = document.createElement('span');
      meta.className = 'meta';
      const time = new Date(message.createdAt).toLocaleTimeString();
      meta.textContent = `${mine ? 'you' : message.senderName} · ${time}${mine ? ` · ${message.status === 'read' ? '✓✓ read' : '✓ sent'}` : ''}`;
      bubble.append(text, meta);
      box.appendChild(bubble);
    }
    box.scrollTop = box.scrollHeight;
  }

  function onTypingInput() {
    if (!state.conversation) return;
    if (!state.isTyping) {
      state.isTyping = true;
      emit('presence:typing', { roomId: state.conversation.id });
    }
    clearTimeout(state.typingTimer);
    state.typingTimer = setTimeout(stopTyping, 1500);
  }

  function stopTyping() {
    clearTimeout(state.typingTimer);
    if (state.isTyping && state.conversation) emit('presence:stop_typing', { roomId: state.conversation.id });
    state.isTyping = false;
  }

  handlers['chat:receive_message'] = async message => {
    if (message.conversationId === state.conversation?.id) {
      addMessage(message);
      if (message.senderId !== state.me?.id) await markRead();
    } else {
      await loadConversations();
    }
  };
  handlers['chat:message_read'] = payload => {
    if (payload.conversationId !== state.conversation?.id) return;
    for (const message of state.messages.values()) if (message.senderId === state.me?.id) message.status = 'read';
    renderMessages();
  };
  handlers['chat:message_deleted'] = payload => {
    if (payload.conversationId !== state.conversation?.id) return;
    state.messages.delete(payload.messageId);
    renderMessages();
  };
  handlers['chat:message_edited'] = payload => {
    const message = state.messages.get(payload.messageId);
    if (!message) return;
    message.text = payload.text;
    renderMessages();
  };
  handlers['presence:typing'] = payload => {
    if (payload.roomId === state.conversation?.id && payload.userId !== state.me?.id) $('typingIndicator').textContent = `${payload.name ?? 'someone'} is typing…`;
  };
  handlers['presence:stop_typing'] = payload => {
    if (payload.roomId === state.conversation?.id) $('typingIndicator').textContent = '';
  };
  handlers['chat:conversation_updated'] = () => loadConversations();
  handlers['chat:conversation_removed'] = payload => {
    if (payload.conversationId === state.conversation?.id) {
      state.conversation = null;
      $('chatBox').hidden = true;
    }
    return loadConversations();
  };

{{/if}}
{{#if CALLING}}
  // ── calls ────────────────────────────────────────────────────────────────────

  const ENDED_EVENTS = { 'call:rejected': 'rejected', 'call:cancelled': 'cancelled', 'call:ended': 'ended', 'call:missed': 'missed' };

  function showCall(call, status, { isCaller }) {
    state.call = { id: call.id, callType: call.callType, isGroupCall: call.isGroupCall, isCaller, joined: false };
    $('incoming').hidden = true;
    $('activeCall').hidden = false;
    $('callId').textContent = call.id;
    $('cancelBtn').hidden = !isCaller;
    setCallStatus(status);
  }

  function setCallStatus(status) {
    $('callStatus').textContent = status;
  }

  async function startCall(callType) {
    if (state.call) throw new Error('Already in a call – end it first');
    const target = requireTarget();
    const { data } = await api('POST', '/calls', { receiverId: target.id, callType });
    showCall(data, 'ringing…', { isCaller: true });
  }

  async function startGroupCall(callType) {
    if (state.call) throw new Error('Already in a call – end it first');
    const participantIds = $('groupIds').value.split(',').map(id => id.trim()).filter(Boolean);
    if (!participantIds.length) throw new Error('Enter at least one user id');
    const { data } = await api('POST', '/calls/group', { participantIds, callType });
    showCall(data, 'ringing…', { isCaller: true });
    // The host of a group call is in the channel right away.
    await joinMedia();
  }

  async function acceptIncoming() {
    const incoming = state.incoming;
    if (!incoming) return;
    state.incoming = null;
    const { data } = await api('POST', `/calls/${incoming.callId}/accept`);
    showCall(data, 'connecting…', { isCaller: false });
    await joinMedia();
  }

  async function rejectIncoming() {
    const incoming = state.incoming;
    if (!incoming) return;
    state.incoming = null;
    $('incoming').hidden = true;
    await api('POST', `/calls/${incoming.callId}/reject`);
  }

  async function cancelCall() {
    if (!state.call) return;
    const id = state.call.id;
    await api('POST', `/calls/${id}/cancel`);
    resetCall('cancelled');
  }

  async function endCall() {
    if (!state.call) return;
    const id = state.call.id;
    await api('POST', `/calls/${id}/${state.call.isGroupCall && !state.call.isCaller ? 'leave' : 'end'}`);
    resetCall('ended');
  }

  /** Joins the call's Agora channel and publishes the microphone (+ camera for video calls). */
  async function joinMedia() {
    const call = state.call;
    if (!call || call.joined) return;
    call.joined = true;
    setCallStatus('connected');
    startTimer();
    if (typeof AgoraRTC === 'undefined') {
      $('mediaNote').textContent = 'Agora Web SDK not loaded (offline?) – signaling still works, no audio / video.';
      return;
    }
    try {
      const { data } = await api('POST', `/calls/${call.id}/agora-token`);
      AgoraRTC.setLogLevel(2);
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      state.agora = client;
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        log('in', `⇠ agora: user ${user.uid} published ${mediaType}`);
        if (mediaType === 'video') user.videoTrack.play(remoteTile(user.uid));
        if (mediaType === 'audio') user.audioTrack.play();
      });
      client.on('user-left', user => {
        log('in', `⇠ agora: user ${user.uid} left`);
        document.getElementById(`remote-${user.uid}`)?.remove();
      });
      await client.join(data.appId, data.channelName, data.token, data.uid);
      state.tracks.mic = await AgoraRTC.createMicrophoneAudioTrack();
      const tracks = [state.tracks.mic];
      if (call.callType === 'video') {
        state.tracks.cam = await AgoraRTC.createCameraVideoTrack();
        state.tracks.cam.play('localVideo');
        tracks.push(state.tracks.cam);
      }
      await client.publish(tracks);
      $('mediaNote').textContent = `In Agora channel ${data.channelName} as uid ${data.uid}.`;
    } catch (error) {
      $('mediaNote').textContent =
        `Media not started: ${error.message}. Signaling still works. Check AGORA_APP_ID / AGORA_APP_CERTIFICATE, ` +
        'microphone / camera permission, and open the page on http://localhost or HTTPS.';
      log('err', `agora: ${error.message}`);
    }
  }

  function remoteTile(uid) {
    let tile = document.getElementById(`remote-${uid}`);
    if (!tile) {
      tile = document.createElement('div');
      tile.className = 'video-tile';
      tile.id = `remote-${uid}`;
      tile.innerHTML = '<div class="video"></div><span></span>';
      tile.children[1].textContent = `uid ${uid}`;
      $('videos').appendChild(tile);
    }
    return tile.firstElementChild;
  }

  async function leaveMedia() {
    for (const key of ['mic', 'cam']) {
      state.tracks[key]?.close();
      state.tracks[key] = null;
    }
    const client = state.agora;
    state.agora = null;
    if (client) await client.leave().catch(() => undefined);
    for (const tile of document.querySelectorAll('[id^="remote-"]')) tile.remove();
  }

  function startTimer() {
    clearInterval(state.timer);
    state.connectedAt = Date.now();
    state.timer = setInterval(() => {
      const seconds = Math.floor((Date.now() - state.connectedAt) / 1000);
      $('callTimer').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }, 1000);
  }

  function resetCall(reason) {
    if (state.call) log('out', `Call ${state.call.id} finished: ${reason}`);
    clearInterval(state.timer);
    state.call = null;
    state.incoming = null;
    leaveMedia();
    $('incoming').hidden = true;
    $('activeCall').hidden = true;
    $('callTimer').textContent = '00:00';
    $('mediaNote').textContent = '';
    $('muteBtn').textContent = 'Mute';
{{#if VIDEO_CALL}}
    $('cameraBtn').textContent = 'Camera off';
{{/if}}
  }

  async function toggleMute() {
    const mic = state.tracks.mic;
    if (!mic) return;
    await mic.setMuted(!mic.muted);
    $('muteBtn').textContent = mic.muted ? 'Unmute' : 'Mute';
  }

{{#if VIDEO_CALL}}
  async function toggleCamera() {
    const cam = state.tracks.cam;
    if (!cam) return;
    await cam.setMuted(!cam.muted);
    $('cameraBtn').textContent = cam.muted ? 'Camera on' : 'Camera off';
  }

{{/if}}
  async function loadHistory() {
    const { data } = await api('GET', '/calls/history?limit=20');
    const list = $('historyList');
    list.replaceChildren();
    for (const call of data.calls) {
      const li = document.createElement('li');
      li.innerHTML = '<span></span><span class="meta"></span>';
      const other = call.callerId === state.me?.id ? call.receiver : call.caller;
      li.children[0].textContent = `${call.callerId === state.me?.id ? '↗' : '↙'} ${call.isGroupCall ? 'group' : other?.name ?? '?'} · ${call.callType}`;
      li.children[1].textContent = `${call.status}${call.duration ? ` · ${call.duration}s` : ''} · ${new Date(call.createdAt).toLocaleString()}`;
      list.appendChild(li);
    }
    if (!data.calls.length) list.innerHTML = '<li class="meta">No calls yet.</li>';
  }

  async function loadActive() {
    const { data } = await api('GET', '/calls/active');
    log('in', 'active call', data.call);
  }

  handlers['call:incoming'] = payload => {
    if (state.call) return log('err', `Incoming call ${payload.callId} while in a call – ignored on this page`);
    state.incoming = payload;
    $('incomingFrom').textContent = payload.callerName || payload.callerId;
    $('incomingType').textContent = `${payload.callType}${payload.isGroupCall ? ', group' : ''}`;
    $('incoming').hidden = false;
  };
  handlers['call:accepted'] = async payload => {
    if (state.call?.id !== payload.callId) return;
    if (state.call.isCaller && !state.call.joined) await joinMedia();
  };
  for (const [event, reason] of Object.entries(ENDED_EVENTS)) {
    handlers[event] = payload => {
      if (state.incoming?.callId === payload.callId) {
        state.incoming = null;
        $('incoming').hidden = true;
        log('in', `Incoming call ${reason}`);
      }
      // One-to-one: the other side finished the call. Group: only the end for everyone does.
      if (state.call?.id === payload.callId && (!state.call.isGroupCall || event === 'call:ended')) resetCall(`${reason} (${payload.endReason ?? '–'})`);
    };
  }

{{/if}}
  // ── wiring ───────────────────────────────────────────────────────────────────

  function on(id, event, handler) {
    const element = $(id);
    if (element) element.addEventListener(event, safe(handler));
  }

{{#if AUTH_EMAIL}}
  on('loginForm', 'submit', login);
{{/if}}
  on('tokenForm', 'submit', event => {
    event.preventDefault();
    return signIn($('tokenInput').value);
  });
  on('logoutBtn', 'click', signOut);
  on('reconnectBtn', 'click', connectSocket);
  on('clearLogBtn', 'click', () => $('log').replaceChildren());
  on('targetId', 'change', () => {
    const id = $('targetId').value.trim();
    setTarget(id ? { id, name: id } : null);
  });
{{#if USERS_API}}
  on('userSearchBtn', 'click', searchUsers);
  on('userSearch', 'keydown', event => (event.key === 'Enter' ? searchUsers() : undefined));
{{/if}}
{{#if CHAT}}
  on('startChatBtn', 'click', startChat);
  on('refreshConversationsBtn', 'click', loadConversations);
  on('sendForm', 'submit', sendMessage);
  on('messageInput', 'input', onTypingInput);
  on('markReadBtn', 'click', markRead);
  on('olderBtn', 'click', loadOlder);
{{/if}}
{{#if CALLING}}
{{#if AUDIO_CALL}}
  on('audioCallBtn', 'click', () => startCall('audio'));
  on('groupAudioBtn', 'click', () => startGroupCall('audio'));
{{/if}}
{{#if VIDEO_CALL}}
  on('videoCallBtn', 'click', () => startCall('video'));
  on('groupVideoBtn', 'click', () => startGroupCall('video'));
  on('cameraBtn', 'click', toggleCamera);
{{/if}}
  on('acceptBtn', 'click', acceptIncoming);
  on('rejectBtn', 'click', rejectIncoming);
  on('cancelBtn', 'click', cancelCall);
  on('endBtn', 'click', endCall);
  on('muteBtn', 'click', toggleMute);
  on('historyBtn', 'click', loadHistory);
  on('activeBtn', 'click', loadActive);
{{/if}}

  // ── start ────────────────────────────────────────────────────────────────────

  (async () => {
    const response = await fetch('/tester/config.json');
    const settings = await response.json();
    state.apiBase = settings.apiBase;
    state.encryption = settings.encryption;
    log('out', `API ${state.apiBase}${state.encryption ? ' (encrypted bodies)' : ''}`);
    let saved = null;
    try {
      saved = sessionStorage.getItem(TOKEN_KEY);
    } catch {
      // storage blocked
    }
    if (saved) await signIn(saved);
  })().catch(error => {
    fail(error);
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  });
})();
