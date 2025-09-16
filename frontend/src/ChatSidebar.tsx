import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number | string;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  token: string;
  apiBaseUrl: string;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  currentChatId,
  onChatSelect,
  onNewChat,
  token,
  apiBaseUrl
}) => {
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const fetchChats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/chats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setChats((data.data || []) as ChatThread[]);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewChat = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/chats`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: 'New Chat' })
      });
      if (response.ok) {
        const data = await response.json();
        setChats(prev => [data.data, ...prev]);
        onNewChat();
        onChatSelect(data.data.id);
      }
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  const updateChatTitle = async (chatId: string, newTitle: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/chats/${chatId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle })
      });
      if (response.ok) {
        setChats(prev => prev.map(chat => chat.id === chatId ? { ...chat, title: newTitle } : chat));
        setEditingId(null);
      }
    } catch (error) {
      console.error('Failed to update chat title:', error);
    }
  };

  const deleteChat = async (chatId: string) => {
    if (!confirm('Delete this chat?')) return;
    try {
      const response = await fetch(`${apiBaseUrl}/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        setChats(prev => prev.filter(chat => chat.id !== chatId));
        if (currentChatId === chatId) onNewChat();
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  useEffect(() => {
    if (isOpen && token) fetchChats();
  }, [isOpen, token]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (diffInHours < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffInHours < 168) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
            className="fixed left-0 top-0 h-full w-80 bg-gray-900 border-r border-gray-700 z-50 flex flex-col"
          >
            <div className="p-4 border-b border-gray-700">
              <button
                onClick={createNewChat}
                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">New Chat</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="space-y-1">
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        currentChatId === chat.id ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-gray-800'
                      }`}
                      onClick={() => onChatSelect(chat.id)}
                    >
                      <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      {editingId === chat.id ? (
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => updateChatTitle(chat.id, editTitle)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateChatTitle(chat.id, editTitle);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                          autoFocus
                        />
                      ) : (
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{chat.title}</p>
                          <p className="text-xs text-gray-400">
                            {formatDate(chat.updatedAt)} • {chat.messageCount} messages
                          </p>
                        </div>
                      )}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingId(chat.id); setEditTitle(chat.title); }}
                          className="p-1 hover:bg-gray-700 rounded"
                        >
                          <Edit2 className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                          className="p-1 hover:bg-gray-700 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatSidebar;
