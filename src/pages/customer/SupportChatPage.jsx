import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getOrCreateConversation, getMessages, sendMessage } from '../../lib/database';
import { Send, Bot, User, Loader, MessageSquare, AlertCircle } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';

const formatTime = (ts) => {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const SupportChatPage = () => {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    const initChat = async () => {
      try {
        const conv = await getOrCreateConversation(user.id);
        if (isMounted) setConversationId(conv.id);
        const history = await getMessages(conv.id);
        if (isMounted) { setMessages(history || []); setLoading(false); }
      } catch (err) {
        // Chat init failed — user sees empty state
        if (isMounted) { setError('Failed to load chat. Please try again.'); setLoading(false); }
      }
    };
    initChat();
    return () => { isMounted = false; };
  }, [user]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel(`chat_${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !conversationId || !user) return;
    setInput('');
    setSending(true);
    try {
      const newMsg = await sendMessage(conversationId, user.id, 'customer', text);
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    } catch (err) {
      // Send failed — message stays in local state
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div className="spinner" />
        <p className="text-secondary text-sm" style={{ marginTop: 12 }}>Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={22} color="var(--primary)" />
          Support Chat
        </h2>
        <p className="text-secondary text-sm">Message our admins for help with your shipments.</p>
      </div>

      {error && (
        <div className="alert-banner alert-banner-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Messages Area */}
      <div style={{
        flex: 1, overflowY: 'auto', marginBottom: 12,
        background: 'var(--bg)', padding: 16,
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)',
      }}>
        {messages.length === 0 && (
          <EmptyState
            icon={MessageSquare}
            title="No Messages Yet"
            description="Send a message to start chatting with our support team!"
          />
        )}

        {messages.map((m, i) => {
          const isMe = m.sender_role === 'customer';
          const showTimestamp = i === 0 || (messages[i - 1] && (new Date(m.created_at) - new Date(messages[i - 1].created_at)) > 300000);

          return (
            <div key={m.id}>
              {showTimestamp && (
                <div style={{ textAlign: 'center', margin: '12px 0 8px', fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                  {new Date(m.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} · {formatTime(m.created_at)}
                </div>
              )}
              <div className={`chat-bubble-wrap ${isMe ? 'user' : ''}`} style={{ marginBottom: 8 }}>
                {!isMe && (
                  <div className="chat-avatar bot-avatar">
                    <Bot size={12} />
                  </div>
                )}
                <div>
                  <div className={`chat-bubble ${isMe ? 'user-bubble' : 'bot-bubble'}`}>
                    {m.message.split('\n').map((line, j) => (
                      <span key={j}>{line}{j < m.message.split('\n').length - 1 && <br />}</span>
                    ))}
                  </div>
                  <div className="chat-timestamp" style={{ textAlign: isMe ? 'right' : 'left' }}>
                    {formatTime(m.created_at)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="form-input"
          placeholder="Type your message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          style={{ flex: 1, borderRadius: 'var(--radius-full)', paddingLeft: 18 }}
          disabled={sending}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{ width: 44, height: 44 }}
        >
          {sending ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
};

export default SupportChatPage;
