import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const WS = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
type User = { id: number; username: string; email?: string };
type ChatMessage = { id?: number; from?: number; content: string; timeStamp?: string; outgoing?: boolean; status?: string };

function parseUsers(data: any): User[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  return [];
}

export default function App() {
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string|null>(null);
  const [me, setMe] = useState<User|null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<User|null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const socket = useRef<WebSocket|null>(null);
  const bottom = useRef<HTMLDivElement|null>(null);

  const disconnect = useCallback(() => {
    socket.current?.close(); socket.current = null; setStatus('disconnected');
  }, []);

  const loadUsers = useCallback(async (accessToken: string) => {
    const res = await fetch(`${API}/api/users`, { headers: { Authorization: `Bearer ${accessToken}` }, credentials: 'include' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Could not load users');
    const list = parseUsers(body);
    setUsers(list);
    setSelected(current => current && list.some(u => u.id === current.id) ? list.find(u => u.id === current.id)! : list[0] || null);
  }, []);

  const connect = useCallback((accessToken: string) => {
    disconnect(); setStatus('connecting');
    const ws = new WebSocket(`${WS}/?token=${encodeURIComponent(accessToken)}`);
    socket.current = ws;
    ws.onopen = () => setStatus('connected');
    ws.onmessage = event => {
      try {
        const msg = JSON.parse(String(event.data));
        if (msg.type === 'message') setMessages(old => [...old, { id: msg.id, from: msg.from, content: msg.content, timeStamp: msg.timeStamp || msg.timestamp }]);
        else if (msg.type === 'queued' || msg.type === 'delivered') {
          setMessages(old => {
            const i = [...old].map((m, index) => ({m,index})).reverse().find(x => x.m.outgoing && x.m.content === msg.content)?.index;
            return i === undefined ? old : old.map((m,index) => index === i ? {...m, id: msg.id ?? m.id, status: msg.type} : m);
          });
          setNotice(msg.type === 'queued' ? 'Message queued for delivery.' : 'Message sent.');
        } else if (msg.type === 'info') setNotice(msg.message || '');
        else if (msg.type === 'error') setError(msg.message || 'WebSocket error');
      } catch { setError('Could not read server message.'); }
    };
    ws.onerror = () => setError('WebSocket connection error.');
    ws.onclose = () => { if (socket.current === ws) { socket.current = null; setStatus('disconnected'); } };
  }, [disconnect]);

  const startSession = useCallback(async (accessToken: string, user?: User) => {
    setToken(accessToken); setMe(user || null);
    await loadUsers(accessToken); connect(accessToken);
  }, [connect, loadUsers]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
        const body = await res.json().catch(() => ({}));
        if (res.ok && body.accessToken && !cancelled) {
          setToken(body.accessToken);
          setMe(body.user ? { id: body.user.id, email: body.user.email, username: body.user.username || body.user.email } : null);
          await loadUsers(body.accessToken);
          if (!cancelled) connect(body.accessToken);
        }
      } catch { /* No valid refresh cookie; remain on sign-in screen. */ }
    })();
    return () => { cancelled = true; disconnect(); };
  }, []);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function authenticate(e: FormEvent) {
    e.preventDefault(); setError(''); setNotice('');
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = mode === 'login' ? { email, password } : { email, username, password };
      const res = await fetch(`${API}${path}`, { method: 'POST', headers: {'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(payload) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || body.message || 'Request failed');
      if (mode === 'register') { setMode('login'); setPassword(''); setNotice('Account created. Sign in to continue.'); return; }
      if (!body.accessToken) throw new Error('Login response did not include accessToken');
      await startSession(body.accessToken, body.user ? { id: body.user.id, email: body.user.email, username: body.user.username || username } : undefined);
    } catch (err) { setError(err instanceof Error ? err.message : 'Authentication failed'); }
  }

  async function logout() {
    try { await fetch(`${API}/api/auth/logout`, { method:'POST', credentials:'include', headers: token ? {Authorization:`Bearer ${token}`} : {} }); } catch { /* clear local state regardless */ }
    disconnect(); setToken(null); setMe(null); setUsers([]); setSelected(null); setMessages([]); setPassword('');
  }

  function send(e: FormEvent) {
    e.preventDefault(); const content = draft.trim();
    if (!content || !selected || socket.current?.readyState !== WebSocket.OPEN) return;
    socket.current.send(JSON.stringify({ type:'message', to:selected.id, content }));
    setMessages(old => [...old, { content, outgoing:true, status:'sent', timeStamp:new Date().toISOString() }]);
    setDraft(''); setError('');
  }

  if (!token) return <main className="auth-wrap"><section className="auth-card"><div className="mark">m</div><p className="eyebrow">PRIVATE MESSAGING</p><h1>{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h1><p className="sub">A quiet space for your conversations.</p><form onSubmit={authenticate} className="auth-form">
    {mode === 'register' && <label>Username<input required value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" /></label>}
    <label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" /></label>
    <label>Password<input required type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='login'?'current-password':'new-password'} /></label>
    {error && <p className="error">{error}</p>}{notice && <p className="notice">{notice}</p>}
    <button className="primary">{mode === 'login' ? 'Sign in' : 'Create account'}</button></form><button className="switch" onClick={()=>{setMode(mode==='login'?'register':'login');setError('');setNotice('');}}>{mode==='login'?'New here? Create an account':'Already registered? Sign in'}</button></section></main>;

  return <main className="layout"><aside className="sidebar"><header className="side-head"><div className="brand"><span className="mark mini">m</span>messages</div><button className="logout" onClick={logout} title="Sign out">↗</button></header>
    <div className="me"><div className="avatar">{(me?.username || me?.email || 'Y').slice(0,1).toUpperCase()}</div><div><b>{me?.username || me?.email || 'Your account'}</b><small>{me?.email || 'Signed in'}</small></div></div>
    <div className="list-title">CONVERSATIONS <span>{users.length}</span></div><div className="user-list">{users.map(u=><button key={u.id} className={`user ${selected?.id===u.id?'active':''}`} onClick={()=>{setSelected(u);setMessages([]);setError('');}}><div className="avatar">{u.username.slice(0,1).toUpperCase()}</div><div><b>{u.username}</b><small>Open conversation</small></div><span className="chevron">›</span></button>)}{!users.length&&<p className="empty">No other users yet.</p>}</div>
    <footer><i className={`dot ${status}`} />{status}</footer></aside>
    <section className="chat">{selected ? <><header className="chat-head"><div className="avatar">{selected.username.slice(0,1).toUpperCase()}</div><div><b>{selected.username}</b><small>Conversation</small></div><span className={`ws-status ${status}`}>{status}</span></header>
      <div className="messages"><div className="intro"><div className="avatar big">{selected.username.slice(0,1).toUpperCase()}</div><h2>{selected.username}</h2><p>This is the beginning of your conversation.</p></div>
        {messages.map((m,i)=><div key={`${m.id ?? 'local'}-${i}`} className={`message-row ${m.outgoing?'mine':''}`}><div className="bubble"><p>{m.content}</p><small>{m.timeStamp ? new Date(m.timeStamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : ''}{m.outgoing&&m.status?` · ${m.status}`:''}</small></div></div>)}<div ref={bottom}/></div>
      <form className="composer" onSubmit={send}><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder={status==='connected'?'Write a message…':'Waiting for connection…'} disabled={status!=='connected'}/><button disabled={!draft.trim()||status!=='connected'} aria-label="Send">↑</button></form>{(error||notice)&&<p className={`feedback ${error?'error':''}`}>{error||notice}</p>}</> : <div className="empty-chat"><div className="spark">✳</div><h2>Your conversations, simplified.</h2><p>Select someone from the sidebar to start chatting.</p></div>}</section></main>;
}
