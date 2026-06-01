import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  getAdminConversations,
  getMessages,
  markCustomerMessagesRead,
  sendMessage,
  withTimeout,
} from '../../lib/database';
import EmptyState from '../../components/ui/EmptyState';
import { MessageSquare, Send, Loader, User } from 'lucide-react';

const InboxPage = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [errorList, setErrorList] = useState(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Load conversations
  const loadConvs = async () => {
    setErrorList(null);
    try {
      const data = await withTimeout(getAdminConversations());
      setConversations(data || []);
    } catch (err) {
      // Error handled silently — user sees empty state
      setErrorList(err.message || 'Failed to load conversations.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadConvs();

    // Subscribe to new conversations
    const channel = supabase.channel('admin_conversations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, () => {
        loadConvs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load messages when a conversation is selected
  useEffect(() => {
    if (!activeConv) return;
    let isMounted = true;

    const loadMsgs = async () => {
      setLoadingChat(true);
      try {
        const history = await getMessages(activeConv.id);
        if (isMounted) {
          setMessages((history || []).map(message =>
            message.sender_role === 'customer' ? { ...message, is_read: true } : message
          ));
        }
        markCustomerMessagesRead(activeConv.id).catch(() => {});
      } catch (err) {
        // Message load failed — user sees empty state
      } finally {
        if (isMounted) setLoadingChat(false);
      }
    };
    loadMsgs();

    return () => { isMounted = false; };
  }, [activeConv]);

  // Subscribe to real-time messages for active conversation
  useEffect(() => {
    if (!activeConv) return;

    const channel = supabase.channel(`chat_admin_${activeConv.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${activeConv.id}`
        },
        (payload) => {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            const incoming = payload.new.sender_role === 'customer'
              ? { ...payload.new, is_read: true }
              : payload.new;
            return [...prev, incoming];
          });
          if (payload.new.sender_role === 'customer') {
            markCustomerMessagesRead(activeConv.id).catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !activeConv || !user) return;
    
    setInput('');
    setSending(true);

    try {
      const newMsg = await sendMessage(activeConv.id, user.id, 'admin', text);
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    } catch (err) {
      // Send failed — message not delivered
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="page-transition admin-inbox-page">
      <h1 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: 24 }}>Customer Inbox</h1>
      
      <div className="inbox-layout">
        
        {/* Left Panel: Conversations List */}
        <div className="inbox-sidebar">
          <div style={{ padding: '16px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Conversations</h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingList ? (
              <div className="flex-center p-md"><Loader size={24} className="animate-spin text-secondary" /></div>
            ) : errorList ? (
              <div className="p-md text-center text-sm" style={{ color: '#EF4444' }}>
                <p><strong>Error loading chats</strong></p>
                <p style={{ marginTop: 4 }}>{errorList}</p>
                <button className="btn btn-ghost btn-sm mt-sm" onClick={loadConvs}>Retry</button>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-md text-center text-sm text-secondary">No customer messages yet.</div>
            ) : (
              conversations.map((conv, i) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConv(conv)}
                  className={`inbox-conversation-item stagger-item ${activeConv?.id === conv.id ? 'active' : ''}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: activeConv?.id === conv.id ? 'linear-gradient(135deg,var(--primary),var(--primary-light))' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={20} color={activeConv?.id === conv.id ? 'white' : '#64748B'} />
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conv.profiles?.name || 'Unknown Customer'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      {new Date(conv.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Chat Messages */}
        <div className="inbox-chat-area">
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="inbox-chat-header">
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary),var(--primary-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={18} color="white" />
                </div>
                <div className="inbox-chat-user-meta">
                  <div style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--accent)' }}>
                    {activeConv.profiles?.name || 'Customer'}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeConv.profiles?.email}</div>
                </div>
              </div>

              {/* Chat Area */}
              <div className="inbox-chat-messages">
                {loadingChat ? (
                  <div className="flex-center h-full"><Loader size={24} className="animate-spin text-secondary" /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-sm text-secondary" style={{ marginTop: 20 }}>No messages in this conversation.</div>
                ) : (
                  messages.map(m => {
                    const isAdmin = m.sender_role === 'admin';
                    return (
                      <div key={m.id} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                        <div className="inbox-message-stack">
                          <div style={{
                            padding: '10px 14px', 
                            borderRadius: isAdmin ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            background: isAdmin ? 'var(--accent)' : 'white',
                            color: isAdmin ? 'white' : '#0F172A', 
                            fontSize: '0.875rem', lineHeight: 1.5,
                            overflowWrap: 'break-word',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)', 
                            border: isAdmin ? 'none' : '1px solid #E2E8F0',
                          }}>
                            {m.message.split('\n').map((line, j) => <span key={j}>{line}<br /></span>)}
                          </div>
                          <div className="chat-timestamp" style={{
                            fontSize: '0.6875rem',
                            color: '#94A3B8',
                            marginTop: 4,
                            textAlign: isAdmin ? 'right' : 'left',
                            padding: '0 4px',
                          }}>
                            {formatTimestamp(m.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="inbox-chat-input-area">
                <input 
                  className="form-input" 
                  placeholder="Type a reply..." 
                  value={input} 
                  onChange={e => setInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleSend()} 
                  style={{ flex: 1, minWidth: 0 }} 
                  disabled={sending}
                />
                <button 
                  className="btn btn-primary" 
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                >
                  {sending ? <Loader size={18} className="animate-spin" /> : <><Send size={18} /> Reply</>}
                </button>
              </div>
            </>
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="No Conversation Selected"
              description="Select a customer from the left to view and reply to their messages."
              className="h-full"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default InboxPage;
