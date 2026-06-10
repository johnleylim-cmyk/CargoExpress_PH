import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getOrCreateConversation, getMessages, sendMessage } from '../../lib/database';
import { Send, Bot, Loader, MessageSquare } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../hooks/useToast';
import { SkeletonChat } from '../../components/ui/SkeletonLoader';

const formatTime = (ts) => {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const SupportChatPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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
        if (isMounted) { toast.error('Failed to load chat. Please try again.'); setLoading(false); }
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
      toast.error('Failed to send message. Please try again.');
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div
        className="page-transition support-chat-page"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="sr-only">Loading support chat...</span>
        <SkeletonChat />
      </div>
    );
  }

  return (
    <div className="support-chat-page page-transition">
      {/* Header */}
      <div className="mb-16">
        <h2 className="fw-800 mb-4 flex items-center gap-8">
          <MessageSquare size={22} color="var(--primary)" />
          Support Chat
        </h2>
        <p className="text-secondary text-sm">Message our admins for help with your shipments.</p>
      </div>

      {/* Messages Area */}
      <div className="support-chat-messages" role="log" aria-live="polite" aria-label="Support chat messages">
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
                <div className="text-center mt-12 mb-8 text-tertiary fw-600" style={{ fontSize: '0.6875rem' }}>
                  {new Date(m.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} · {formatTime(m.created_at)}
                </div>
              )}
              <div className={`support-message-row ${isMe ? 'is-me' : 'is-admin'}`}>
                {!isMe && (
                  <div className="chat-avatar bot-avatar">
                    <Bot size={12} />
                  </div>
                )}
                <div className="support-message-stack">
                  <div className={`support-message-bubble ${isMe ? 'user-bubble' : 'bot-bubble'}`}>
                    {m.message.split('\n').map((line, j) => (
                      <span key={j}>{line}{j < m.message.split('\n').length - 1 && <br />}</span>
                    ))}
                  </div>
                  <div className={`chat-timestamp ${isMe ? 'text-right' : ''}`}>
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
      <div className="flex gap-8">
        <input
          className="form-input flex-1"
          placeholder="Type your message..."
          aria-label="Type your support message"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          style={{ borderRadius: 'var(--radius-full)', paddingLeft: 18 }}
          disabled={sending}
        />
        <button
          className="chat-send-btn"
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || sending}
          aria-label={sending ? 'Sending message' : 'Send message'}
          style={{ width: 44, height: 44 }}
        >
          {sending ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
};

export default SupportChatPage;
