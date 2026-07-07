import React, { createContext } from 'react';
import { appendToken, getBasePath } from '../../utils/apiUrl';

/**
 * Single shared `/ws/terminal` connection.
 *
 * Why a shared ws:
 * - 改前 ChatView (`_inputWs`) 与 TerminalPanel (`this.ws`) 各开一条,服务端广播给两条
 *   client-readyState=1 的连接,导致 PTY data / state / exit 等大量消息**双倍传输**,
 *   ChatView 端还要跑 `_stripAnsi` + `_detectPrompt` 解析全量 raw bytes(纯浪费 CPU)。
 * - 合并到单 ws 后,server 端无需 role 过滤、`activeWs` 仲裁简化、新消息类型不再要决策"该过滤谁"。
 *
 * Provider 职责:
 * - 在 `props.open=true` 时建立 ws,`open=false` 时关闭
 * - 内部封装重连(2s 退避),消费者无感
 * - `addMessageHandler` 把单条 onmessage 派发给所有注册者(各自 switch type)
 * - `addStateListener` 通知 open/close,TerminalPanel 用它在 onopen 后立即 sendResize
 *
 * 默认值是 no-op,纯 web 模式 / 未包 Provider 时调用不报错。
 */
export const TerminalWsContext = createContext({
  send: () => false,
  isOpen: () => false,
  addMessageHandler: () => () => {},
  addStateListener: () => () => {},
});

const RECONNECT_DELAY_MS = 2000;
const REPLAY_MAX_CHUNKS = 512;
const REPLAY_MAX_BYTES = 2 * 1024 * 1024;

export class TerminalWsProvider extends React.Component {
  constructor(props) {
    super(props);
    this.ws = null;
    this.messageHandlers = new Set();
    this.stateListeners = new Set();
    this.reconnectTimer = null;
    this.lastStateMessage = null;
    this.replayMessages = [];
    this.replayBytes = 0;
    this._unmounted = false;
    this._ctxValue = {
      send: this.send,
      isOpen: this.isOpen,
      addMessageHandler: this.addMessageHandler,
      addStateListener: this.addStateListener,
    };
  }

  componentDidMount() {
    if (this.props.open) this.connect();
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.open && this.props.open) {
      this.connect();
    } else if (prevProps.open && !this.props.open) {
      this.disconnect();
    }
  }

  componentWillUnmount() {
    this._unmounted = true;
    this.disconnect();
  }

  connect = () => {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    let url;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // 带上 LAN token —— 服务端 WS upgrade 与 HTTP 同款鉴权,远程 ?token= 终端必须携带凭证。
      // 密码登录用户由浏览器自动随握手发送 cxv_auth cookie,此处无 token 时原样返回。
      url = appendToken(`${protocol}//${window.location.host}${getBasePath().replace(/\/$/, '')}/ws/terminal`);
    } catch (e) {
      return; // SSR / 测试环境兜底
    }
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      console.warn('[TerminalWsProvider] WebSocket constructor failed:', e);
      this._scheduleReconnect();
      return;
    }
    this.ws = ws;
    this._resetReplayCache();

    ws.onopen = () => {
      this._notifyState('open');
    };

    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch {
        // 整条消息丢弃 = 数据流中间挖洞且无路径补发（概率极低：ws 帧不会截断 JSON）
        // → 请求权威快照对齐兜底（服务端有冷却，不会风暴）
        try { ws.send(JSON.stringify({ type: 'resync-request' })); } catch {}
        return;
      }
      this._rememberMessage(msg);
      // 单点 onmessage 派发给所有 handler;handler 抛错被吞,不影响其他。
      for (const h of this.messageHandlers) {
        try { h(msg); } catch (e) { console.warn('[TerminalWsProvider] handler error:', e); }
      }
    };

    ws.onerror = () => {
      this._notifyState('error');
    };

    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
      this._notifyState('close');
      // 仅当 props.open 仍为 true 且未 unmount,才安排重连。
      if (!this._unmounted && this.props.open) this._scheduleReconnect();
    };
  };

  disconnect = () => {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      try { ws.onclose = null; } catch {}
      try { ws.close(); } catch {}
    }
  };

  _resetReplayCache = () => {
    this.lastStateMessage = null;
    this.replayMessages = [];
    this.replayBytes = 0;
  };

  _messageBytes = (msg) => (
    typeof msg?.data === 'string' ? msg.data.length : 0
  );

  _rememberMessage = (msg) => {
    if (!msg || typeof msg.type !== 'string') return;
    if (msg.type === 'state') {
      this.lastStateMessage = msg;
      return;
    }
    if (msg.type !== 'data' && msg.type !== 'data-resync' && msg.type !== 'exit') return;
    const bytes = this._messageBytes(msg);
    // data-resync 是服务端权威快照；保留它之前的增量会让新挂载终端重复渲染旧状态。
    if (msg.type === 'data-resync') {
      this.replayMessages = [msg];
      this.replayBytes = bytes;
    } else {
      this.replayMessages.push(msg);
      this.replayBytes += bytes;
    }
    while (this.replayMessages.length > REPLAY_MAX_CHUNKS || this.replayBytes > REPLAY_MAX_BYTES) {
      const dropped = this.replayMessages.shift();
      this.replayBytes -= this._messageBytes(dropped);
    }
  };

  _replayToHandler = (fn) => {
    if (this.lastStateMessage) {
      try { fn(this.lastStateMessage); } catch (e) { console.warn('[TerminalWsProvider] replay state handler error:', e); }
    }
    for (const msg of this.replayMessages) {
      try { fn(msg); } catch (e) { console.warn('[TerminalWsProvider] replay handler error:', e); }
    }
  };

  _scheduleReconnect = () => {
    if (this.reconnectTimer || this._unmounted) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this._unmounted && this.props.open) this.connect();
    }, RECONNECT_DELAY_MS);
  };

  _notifyState = (state) => {
    for (const l of this.stateListeners) {
      try { l(state); } catch (e) { console.warn('[TerminalWsProvider] state listener error:', e); }
    }
  };

  send = (obj) => {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      ws.send(JSON.stringify(obj));
      return true;
    } catch (e) {
      console.warn('[TerminalWsProvider] send error:', e);
      return false;
    }
  };

  isOpen = () => {
    const ws = this.ws;
    return !!(ws && ws.readyState === WebSocket.OPEN);
  };

  addMessageHandler = (fn) => {
    if (typeof fn !== 'function') return () => {};
    this.messageHandlers.add(fn);
    this._replayToHandler(fn);
    return () => { this.messageHandlers.delete(fn); };
  };

  addStateListener = (fn) => {
    if (typeof fn !== 'function') return () => {};
    this.stateListeners.add(fn);
    return () => { this.stateListeners.delete(fn); };
  };

  render() {
    return (
      <TerminalWsContext.Provider value={this._ctxValue}>
        {this.props.children}
      </TerminalWsContext.Provider>
    );
  }
}
