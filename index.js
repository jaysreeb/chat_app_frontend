  const API = 'http://localhost:3000';
  let token = null;
  let currentUserId = null;
  let currentEmail = null;
  let recipientId = null;
  let ws = new WebSocket('ws://localhost:3000');
  let currentUsername = null;

  function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
    event.target.classList.add('active');
  }

  //Register
  async function handleRegister() {
    const email = document.getElementById('reg-email').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const msg = document.getElementById('reg-msg');

    if (!email ||!username ||!password) { showMsg(msg, 'All fields are required', 'error'); return; }

    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email,username,password })
      });
      const data = await res.json();
      if (!res.ok) 
      { 
        showMsg(msg, data.error || 'registration failed', 'error'); 
        return;
      }

      showMsg(msg, `account created! your id: ${data.user.id} with username: ${data.user.username} , Please Login`, 'success');

    } catch (e) {
      showMsg(msg, 'connection error', 'error');
    }
  }

  //Login
  async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    // const username = document.getElementById('reg-username').value.trim();
    const msg = document.getElementById('login-msg');

    if (!email || !password) { showMsg(msg, 'email and password required', 'error'); return; }

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) { showMsg(msg, data.error, 'error'); return; }

      token = data.token;
      currentUserId = data.user.id;
      currentEmail = data.user.email;
      // currentUsername = data.user.username;

      enterChat();
    } catch (e) {
      showMsg(msg, 'connection error', 'error');
    }
  }

  //Enter chat
  function enterChat() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('chat-screen').classList.add('visible');
    document.getElementById('user-info').textContent = `${currentUsername}`; 
    connectWebSocket();
  }

  //WebSocket
  function connectWebSocket() {
    // Choose a protocol based on the current page's protocol to avoid mixed content issues
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}?token=${token}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      document.getElementById('status-dot').classList.add('online');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'connected') {
        addSystemMessage('websocket connected', 'success');
      } else if (data.type === 'message') {
        addMessage(data.content, 'received', data.from, data.timestamp);
      } else if (data.type === 'delivered') {
        // already shown as sent
      } else if (data.type === 'queued') {
        addSystemMessage('user offline: message saved, will deliver on reconnect');
      } else if (data.type === 'info') {
        addSystemMessage(data.message, 'success');
      } else if (data.type === 'error') {
        addSystemMessage(data.message);
      }else if (data.type === 'message') {
        addMessage(data.content, 'received', data.from, data.timestamp, data.fromUsername); 
      }
    };

    ws.onclose = () => {
      document.getElementById('status-dot').classList.remove('online');
      addSystemMessage('disconnected');
    };

    ws.onerror = () => {
      addSystemMessage('websocket error');
    };
  }

  //Set recipient
  function setRecipient() {
    const val = parseInt(document.getElementById('recipient-id').value);
    if (!val || isNaN(val)) return;

    recipientId = val;
    document.getElementById('chatting-with').textContent = `user #${recipientId}`;
    document.getElementById('message-input').disabled = false;
    document.getElementById('send-btn').disabled = false;
    document.getElementById('message-input').focus();
    addSystemMessage(`chatting with user #${recipientId}`);
  }

  //Send message
  function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();

    if (!content || !ws || ws.readyState !== WebSocket.OPEN || !recipientId) return;

    ws.send(JSON.stringify({ type: 'message', to: recipientId, content }));
    addMessage(content, 'sent', currentUserId, new Date().toISOString());
    input.value = '';
  }

  //Add message to Ui
  function addMessage(content, direction, fromId, timestamp, fromUsername) {
    const who = direction === 'received' ? `${data.fromUsername || 'user #' + data.from}` : currentUsername;
    const container = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = `message ${direction}`;
    const time = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    // const who = direction === 'received' ? `user #${fromId}` : 'you';

    div.innerHTML = `
      <div class="message-bubble">${escapeHtml(content)}</div>
      <div class="message-meta">${who} · ${time}</div>
    `;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  //System message
  function addSystemMessage(text, type = '') {
    const container = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = `system-msg${type ? ' ' + type : ''}`;
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  // Logout
  function handleLogout() {
    if (ws) ws.close();
    token = null; currentUserId = null; currentEmail = null; recipientId = null;
    document.getElementById('chat-screen').classList.remove('visible');
    document.getElementById('auth-screen').style.display = 'block';
    document.getElementById('messages').innerHTML = '<div class="system-msg">connected. enter a user id to start chatting.</div>';
    document.getElementById('chatting-with').textContent = '—';
    document.getElementById('message-input').disabled = true;
    document.getElementById('send-btn').disabled = true;
  }

  // Helpers
  function showMsg(el, text, type) {
    el.textContent = text;
    el.className = `msg-small ${type}`;
  }

  function escapeHtml(text) {
    return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

