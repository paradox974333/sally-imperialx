import React, { useState, useEffect, useRef, useMemo, useCallback, memo, lazy, Suspense } from 'react';
import { ArrowUpRight, ChevronDown, X, User, Lock, BarChart3, Settings, TrendingUp, TrendingDown, RefreshCw, Eye, EyeOff, Wallet as WalletIcon, Menu } from 'lucide-react';

import { motion, AnimatePresence, useAnimation, useInView } from 'framer-motion';
import Wallet from './wallet';
import DepositPage from './deposit';

import ChatSidebar from './ChatSidebar';

// --- CONFIGURATION ---
const API_BASE_URL = 'https://sally.imperialx.io';

// --- INTERFACES & TYPES ---
interface AuthUser {
  uid: string;
  username: string;
}

interface ChatApiResponse {
  success: boolean;
  isAnalysis: boolean;
  response: string;
  chatId?: string; // Add this line
  dataSources?: {
    type: string;
    resource: string;
    status: string;
  }[];
  processingTime: number;
  timestamp: string;
  error?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  metadata?: {
    dataSources?: { type: string; resource: string; status: string; }[];
    processingTime?: number;
  }
}

interface CoinData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume: string;
  icon: string;
  marketCap: string;
  coinId: string;
}

interface WalletSummary {
  totalEquity: string;
}

// --- UTILITY FUNCTIONS ---
const generateUsername = () => {
  const adjectives = ['Smart', 'Crypto', 'Digital', 'Quantum', 'Alpha', 'Beta', 'Elite', 'Pro', 'Master', 'Expert'];
  const nouns = ['Trader', 'Investor', 'Analyst', 'Pioneer', 'Explorer', 'Wizard', 'Genius', 'Legend', 'Hero', 'Champion'];
  const numbers = Math.floor(Math.random() * 999) + 1;
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${numbers}`;
};

const generateStrongPassword = () => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.>?';
  
  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  const allChars = lowercase + uppercase + numbers + symbols;
  for (let i = 4; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

const validatePassword = (password: string) => {
  const rules = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSymbol: /[!@#$%^&*()_+\-=\[\]{}|;:,.>?]/.test(password)
  };
  return rules;
};

const validateUsername = (username: string) => {
  const rules = {
    minLength: username.length >= 3,
    maxLength: username.length <= 20,
    validChars: /^[a-zA-Z0-9_]+$/.test(username),
    notEmpty: username.trim().length > 0
  };
  return rules;
};

// --- MEMOIZED COMPONENTS ---
const LoadingSpinner = memo(() => (
  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
));

const CoinTicker = memo(({ 
  coin, 
  onClick 
}: { 
  coin: CoinData; 
  onClick: (coin: CoinData) => void; 
}) => {
  const formatPrice = useCallback((price: number) => {
    return price < 1 ? `$${price.toFixed(4)}` : `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, []);

  return (
    <motion.div
      className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:bg-white/10 rounded-lg p-1 sm:p-2 transition-all duration-300 group min-w-0 shadow-sm"
      onClick={() => onClick(coin)}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
    >
      <span className="text-sm sm:text-lg font-bold text-blue-400 flex-shrink-0">{coin.icon}</span>
      <div className="min-w-0">
        <span className="font-semibold text-white text-xs sm:text-sm block truncate">{coin.symbol.replace('USDT', '')}</span>
        <span className="text-xs text-white/70 block truncate hidden sm:block">{coin.name}</span>
      </div>
      <div className="text-right flex-shrink-0">
        <span className="font-mono text-white font-medium text-xs sm:text-sm block">
          {coin.price > 0 ? formatPrice(coin.price) : '...'}
        </span>
        <div className={`flex items-center gap-1 justify-end ${coin.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {coin.change24h >= 0 ? <TrendingUp size={10} className="sm:w-3 sm:h-3" /> : <TrendingDown size={10} className="sm:w-3 sm:h-3" />}
          <span className="text-xs font-medium">{Math.abs(coin.change24h).toFixed(2)}%</span>
        </div>
      </div>
    </motion.div>
  );
});

const CryptoTickerBar = memo(({ 
  cryptoData, 
  currentTickerIndex, 
  onCoinClick 
}: { 
  cryptoData: CoinData[]; 
  currentTickerIndex: number; 
  onCoinClick: (coin: CoinData) => void; 
}) => {
  const getVisibleCoins = useCallback(() => {
    const visible: CoinData[] = [];
    const coinsToShow = window.innerWidth < 640 ? 2 : window.innerWidth < 1024 ? 3 : 4;
    for (let i = 0; i < coinsToShow; i++) {
      const coin = cryptoData[(currentTickerIndex + i) % cryptoData.length];
      if (coin) visible.push(coin);
    }
    return visible;
  }, [cryptoData, currentTickerIndex]);

  const visibleCoins = useMemo(getVisibleCoins, [getVisibleCoins]);

  return (
    <div className="fixed top-0 left-0 right-0 z-40 h-12 sm:h-16 backdrop-blur-xl border-b border-white/20 bg-black/30 shadow-md">
      <div className="relative overflow-hidden h-full">
        <div className="flex items-center h-full px-2 sm:px-4 gap-2 sm:gap-8">
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-600 rounded-full animate-pulse shadow-lg shadow-green-600/50" />
            <span className="text-xs font-medium text-green-500 hidden sm:inline">LIVE DATA</span>
            <span className="text-xs font-medium text-green-500 sm:hidden">LIVE</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentTickerIndex}
              className="flex items-center gap-2 sm:gap-8 min-w-0 overflow-hidden"
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {visibleCoins.map((coin) => (
                <CoinTicker key={coin.symbol} coin={coin} onClick={onCoinClick} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});

const ChatMessage = memo(({ 
  message, 
  formatMarkdown 
}: { 
  message: ChatMessage; 
  formatMarkdown: (text: string) => string; 
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} 
    animate={{ opacity: 1, y: 0 }}
    className={`mb-4 sm:mb-6 flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
  >
    <div className={`inline-block border rounded-2xl p-3 sm:p-4 backdrop-blur-md max-w-[90%] sm:max-w-[85%] shadow-sm ${
      message.type === 'user' 
        ? 'bg-blue-600/20 border-blue-600/30 text-right' 
        : 'bg-white/10 border-white/20 text-left'
    }`}>
      <div 
        className="prose prose-invert max-w-none text-white/90 leading-relaxed text-sm sm:text-base"
        dangerouslySetInnerHTML={{ __html: `<p>${formatMarkdown(message.content)}</p>` }}
      />
      {message.type === 'ai' && message.metadata?.dataSources && (
        <div className="mt-3 pt-3 border-t border-white/20 text-xs text-white/60">
          <strong>Data Sources:</strong> {message.metadata.dataSources.map(s => s.type).join(', ')}
          <span className="ml-2 opacity-70">({message.metadata.processingTime}ms)</span>
        </div>
      )}
    </div>
  </motion.div>
));

const PasswordStrengthIndicator = memo(({ password }: { password: string }) => {
  const rules = validatePassword(password);
  const strength = Object.values(rules).filter(Boolean).length;
  
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= strength
                ? strength <= 2 ? 'bg-red-500' : strength <= 3 ? 'bg-yellow-500' : 'bg-green-500'
                : 'bg-white/20'
            }`}
          />
        ))}
      </div>
      <div className="text-xs space-y-1">
        <div className={`flex items-center gap-2 ${rules.minLength ? 'text-green-400' : 'text-red-400'}`}>
          <div className={`w-1 h-1 rounded-full ${rules.minLength ? 'bg-green-400' : 'bg-red-400'}`} />
          At least 8 characters
        </div>
        <div className={`flex items-center gap-2 ${rules.hasUppercase ? 'text-green-400' : 'text-red-400'}`}>
          <div className={`w-1 h-1 rounded-full ${rules.hasUppercase ? 'bg-green-400' : 'bg-red-400'}`} />
          One uppercase letter
        </div>
        <div className={`flex items-center gap-2 ${rules.hasLowercase ? 'text-green-400' : 'text-red-400'}`}>
          <div className={`w-1 h-1 rounded-full ${rules.hasLowercase ? 'bg-green-400' : 'bg-red-400'}`} />
          One lowercase letter
        </div>
        <div className={`flex items-center gap-2 ${rules.hasNumber ? 'text-green-400' : 'text-red-400'}`}>
          <div className={`w-1 h-1 rounded-full ${rules.hasNumber ? 'bg-green-400' : 'bg-red-400'}`} />
          One number
        </div>
        <div className={`flex items-center gap-2 ${rules.hasSymbol ? 'text-green-400' : 'text-red-400'}`}>
          <div className={`w-1 h-1 rounded-full ${rules.hasSymbol ? 'bg-green-400' : 'bg-red-400'}`} />
          One special character
        </div>
      </div>
    </div>
  );
});

const UsernameValidation = memo(({ username }: { username: string }) => {
  const rules = validateUsername(username);
  
  return (
    <div className="mt-2 text-xs space-y-1">
      <div className={`flex items-center gap-2 ${rules.minLength ? 'text-green-400' : 'text-red-400'}`}>
        <div className={`w-1 h-1 rounded-full ${rules.minLength ? 'bg-green-400' : 'bg-red-400'}`} />
        At least 3 characters
      </div>
      <div className={`flex items-center gap-2 ${rules.maxLength ? 'text-green-400' : 'text-red-400'}`}>
        <div className={`w-1 h-1 rounded-full ${rules.maxLength ? 'bg-green-400' : 'bg-red-400'}`} />
        Maximum 20 characters
      </div>
      <div className={`flex items-center gap-2 ${rules.validChars ? 'text-green-400' : 'text-red-400'}`}>
        <div className={`w-1 h-1 rounded-full ${rules.validChars ? 'bg-green-400' : 'bg-red-400'}`} />
        Only letters, numbers, and underscores
      </div>
    </div>
  );
});

const AuthModal = memo(({ 
  isOpen, 
  onClose, 
  onAuth, 
  isLogin, 
  setIsLogin, 
  authForm, 
  setAuthForm, 
  isLoading, 
  error 
}: any) => {
  const [showPassword, setShowPassword] = useState(false);
  
  if (!isOpen) return null;

  const handleGenerateCredentials = () => {
    const newUsername = generateUsername();
    const newPassword = generateStrongPassword();
    setAuthForm({
      ...authForm,
      username: newUsername,
      password: newPassword
    });
  };

  const canSubmit = () => {
    if (isLogin) {
      return authForm.username.trim() && authForm.password;
    } else {
      const usernameRules = validateUsername(authForm.username);
      const passwordRules = validatePassword(authForm.password);
      return Object.values(usernameRules).every(Boolean) && Object.values(passwordRules).every(Boolean);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-black/95 border border-white/30 rounded-3xl p-6 sm:p-8 w-full max-w-md relative shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 sm:top-6 right-4 sm:right-6 text-white/60 hover:text-white transition-colors p-2 z-10"
        >
          <X size={20} className="sm:w-6 sm:h-6" />
        </button>
        
        <h2 className="text-xl sm:text-2xl font-bold mb-2">{isLogin ? 'Sign In' : 'Create Account'}</h2>
        <p className="text-white/80 mb-6 text-sm sm:text-base">
          {isLogin ? 'Access your analysis dashboard' : 'Join the future of financial analysis'}
        </p>
        
        {!isLogin && (
          <div className="mb-4 p-3 bg-blue-600/20 border border-blue-600/30 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-blue-400">Need credentials?</span>
              <button
                type="button"
                onClick={handleGenerateCredentials}
                className="flex items-center gap-1 text-xs bg-blue-600/40 hover:bg-blue-600/60 px-2 py-1 rounded-lg transition-colors"
              >
                <RefreshCw size={12} />
                Generate
              </button>
            </div>
            <p className="text-xs text-white/70">
              Click generate to create a secure username and password automatically.
            </p>
          </div>
        )}
        
        <form onSubmit={onAuth} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/60" />
            <input 
              type="text" 
              placeholder="Username" 
              value={authForm.username} 
              onChange={e => setAuthForm({...authForm, username: e.target.value})} 
              className="auth-input text-sm sm:text-base" 
              required 
            />
            {!isLogin && authForm.username && (
              <UsernameValidation username={authForm.username} />
            )}
          </div>
          
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/60" />
              <input 
                type="email" 
                placeholder="Email (optional)" 
                value={authForm.email} 
                onChange={e => setAuthForm({...authForm, email: e.target.value})} 
                className="auth-input text-sm sm:text-base" 
              />
            </div>
          )}
          
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/60" />
            <input 
              type={showPassword ? "text" : "password"}
              placeholder="Password" 
              value={authForm.password} 
              onChange={e => setAuthForm({...authForm, password: e.target.value})} 
              className="auth-input text-sm sm:text-base pr-12" 
              required 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            {!isLogin && authForm.password && (
              <PasswordStrengthIndicator password={authForm.password} />
            )}
          </div>
          
          {error && <p className="text-red-500 text-sm bg-red-600/20 p-3 rounded-lg">{error}</p>}
          
          <button 
            type="submit" 
            disabled={isLoading || !canSubmit()} 
            className="w-full bg-gradient-to-r from-blue-500 to-blue-400 text-white font-semibold py-3 rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base shadow-md"
          >
            {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>
        
        <p className="mt-6 text-center text-sm">
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </p>
      </motion.div>
    </div>
  );
});

// --- INITIAL DATA ---
const CRYPTO_COINS: CoinData[] = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', price: 0, change24h: 0, volume: '$0', icon: '₿', marketCap: '$0', coinId: 'bitcoin' },
  { symbol: 'ETHUSDT', name: 'Ethereum', price: 0, change24h: 0, volume: '$0', icon: 'Ξ', marketCap: '$0', coinId: 'ethereum' },
  { symbol: 'BNBUSDT', name: 'BNB', price: 0, change24h: 0, volume: '$0', icon: '⬡', marketCap: '$0', coinId: 'binancecoin' },
  { symbol: 'SOLUSDT', name: 'Solana', price: 0, change24h: 0, volume: '$0', icon: '◎', marketCap: '$0', coinId: 'solana' },
  { symbol: 'XRPUSDT', name: 'XRP', price: 0, change24h: 0, volume: '$0', icon: '◉', marketCap: '$0', coinId: 'ripple' },
  { symbol: 'ADAUSDT', name: 'Cardano', price: 0, change24h: 0, volume: '$0', icon: '₳', marketCap: '$0', coinId: 'cardano' },
  { symbol: 'AVAXUSDT', name: 'Avalanche', price: 0, change24h: 0, volume: '$0', icon: '▲', marketCap: '$0', coinId: 'avalanche-2' },
  { symbol: 'DOTUSDT', name: 'Polkadot', price: 0, change24h: 0, volume: '$0', icon: '●', marketCap: '$0', coinId: 'polkadot' },
  { symbol: 'MATICUSDT', name: 'Polygon', price: 0, change24h: 0, volume: '$0', icon: '⬟', marketCap: '$0', coinId: 'matic-network' },
  { symbol: 'LINKUSDT', name: 'Chainlink', price: 0, change24h: 0, volume: '$0', icon: '⬢', marketCap: '$0', coinId: 'chainlink' },
];

function App() {
  // State Management
  const [inputValue, setInputValue] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [smoothMousePosition, setSmoothMousePosition] = useState({ x: 0, y: 0 });
  
  // Auth State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [authForm, setAuthForm] = useState({ username: '', password: '', email: '' });
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  // Chat State
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  
  // Ticker State
  const [cryptoData, setCryptoData] = useState<CoinData[]>(CRYPTO_COINS);
  const [currentTickerIndex, setCurrentTickerIndex] = useState(0);
  const [showDepositModal, setShowDepositModal] = useState(false);
  
  // Wallet State
  const [showFullWallet, setShowFullWallet] = useState(false);
  const [walletSummary, setWalletSummary] = useState<WalletSummary>({
    totalEquity: '$0.00'
  });

  // NEW: Chat History State
  const [showChatSidebar, setShowChatSidebar] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // Refs for cleanup
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const mouseAnimationRef = useRef<number | null>(null);
  const tickerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const priceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  
  // Enhanced API function with abort controller and better error handling
  const apiCall = useCallback(async (endpoint: string, method: 'GET' | 'POST', body?: any) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    try {
      console.log(`🔄 Making ${method} request to ${API_BASE_URL}/api${endpoint}`, body);
      
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api${endpoint}`, { 
        method, 
        headers, 
        body: body ? JSON.stringify(body) : undefined,
        signal: abortControllerRef.current.signal
      });

      console.log(`📡 Response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 API Response:', data);
      return data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🚫 Request aborted');
        return null;
      }
      console.error('❌ API call failed:', error);
      throw error;
    }
  }, [token]);

  // FIXED: Enhanced formatMarkdown with proper safety checks
  const formatMarkdown = useCallback((text: string | null | undefined) => {
    // Safety check for undefined/null/empty text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return 'Unable to display response content.';
    }
    
    try {
      return text
        .replace(/### (.*$)/gim, '<h3 class="text-lg sm:text-xl font-bold text-white mb-3">$1</h3>')
        .replace(/## (.*$)/gim, '<h2 class="text-xl sm:text-2xl font-bold text-white mb-4">$1</h2>')
        .replace(/\*\*(.*)\*\*/gim, '<strong class="font-semibold text-white">$1</strong>')
        .replace(/\n\n/gim, '</p><p class="mb-4">')
        .replace(/\n/gim, '<br>');
    } catch (error) {
      console.error('Error formatting markdown:', error);
      return text || 'Error formatting response.';
    }
  }, []);

  const formatNumber = useCallback((num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, []);

  // Event Handlers
  const handleCoinClick = useCallback((coin: CoinData) => {
    if (user) {
      setInputValue(`Analyze ${coin.name} (${coin.symbol}) for me.`);
    } else {
      setShowAuthModal(true);
    }
  }, [user]);

  // Enhanced handleAuth with better error handling
  const handleAuth = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 Auth form submitted:', { 
      isLogin, 
      username: authForm.username,
      hasPassword: !!authForm.password,
      hasEmail: !!authForm.email 
    });
    
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = isLogin ? '/login' : '/register';
      const payload = isLogin 
        ? { username: authForm.username, password: authForm.password }
        : { username: authForm.username, password: authForm.password, email: authForm.email };
      
      console.log('📤 Calling API with:', { endpoint, payload: { ...payload, password: '***' } });
      
      const data = await apiCall(endpoint, 'POST', payload);
      
      if (!data) return; // Request was aborted
      
      console.log('✅ Auth successful:', data);

      if (isMountedRef.current) {
        setToken(data.token);
        setUser(data.user);
        
        localStorage.setItem('sally_token', data.token);
        localStorage.setItem('sally_user', JSON.stringify(data.user));
        
        setShowAuthModal(false);
        setAuthForm({ username: '', password: '', email: '' });
      }
    } catch (err: any) {
      console.error('❌ Auth error:', err);
      if (isMountedRef.current) {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [apiCall, isLogin, authForm]);

  const handleSignOut = useCallback(() => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setToken(null);
    setUser(null);
    setChatHistory([]);
    setHasStartedChat(false);
    setWalletSummary({ totalEquity: '$0.00' });
    // NEW: Chat history cleanup
    setCurrentChatId(null);
    setShowChatSidebar(false);
    localStorage.removeItem('sally_token');
    localStorage.removeItem('sally_user');
  }, []);

  // NEW: Chat history functions
  const loadChatMessages = useCallback(async (chatId: string) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages`, {
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        }
      });
      if (response.ok) {
        const data = await response.json();
        const messages = (data.data || []).map((msg: any) => ({
          id: msg.id,
          type: msg.type,
          content: msg.content,
          metadata: msg.metadata
        }));
        setChatHistory(messages);
      }
    } catch (error) {
      console.error('Failed to load chat messages:', error);
    }
  }, [token]);

  const handleChatSelect = useCallback((chatId: string) => {
    setCurrentChatId(chatId);
    loadChatMessages(chatId);
    setShowChatSidebar(false);
  }, [loadChatMessages]);

  const handleNewChat = useCallback(() => {
    setCurrentChatId(null);
    setChatHistory([]);
    setHasStartedChat(false);
  }, []);

  // FIXED: Enhanced handleAsk with comprehensive error handling and fallbacks
  const handleAsk = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !isMountedRef.current) return;

    const userMessage: ChatMessage = { 
      id: `user-${Date.now()}`, 
      type: 'user', 
      content: inputValue 
    };
    
    if (isMountedRef.current) {
      setChatHistory(prev => [...prev, userMessage]);
      setInputValue('');
      setIsLoading(true);
      setError(null);
      if (!hasStartedChat) setHasStartedChat(true);
    }

    try {
      const data: ChatApiResponse = await apiCall('/chat', 'POST', { 
        message: userMessage.content,
        chatId: currentChatId 
      });
      
      if (!data || !isMountedRef.current) return; // Request was aborted or component unmounted
      
      // NEW: If a new chat was created, update current chat ID
      if (data.chatId && data.chatId !== currentChatId) {
        setCurrentChatId(data.chatId);
      }
      
      // FIXED: Comprehensive response content extraction with multiple fallbacks
      let responseContent = '';
      
      if (data.response && typeof data.response === 'string' && data.response.trim()) {
        responseContent = data.response;
      } else if (data.message && typeof data.message === 'string' && data.message.trim()) {
        responseContent = data.message;
      } else if (data.error) {
        responseContent = `Error: ${data.error}`;
      } else {
        // Last resort fallbacks
        if (data.success === false) {
          responseContent = 'The AI encountered an issue processing your request. Please try again.';
        } else {
          responseContent = 'I received your message but couldn\'t generate a proper response. Please try rephrasing your question.';
        }
      }
      
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: responseContent,
        metadata: {
          dataSources: data.dataSources || [],
          processingTime: data.processingTime || 0,
        },
      };
      
      setChatHistory(prev => [...prev, aiMessage]);
      
    } catch (err: any) {
      if (!isMountedRef.current) return;
      
      console.error('Chat error:', err);
      setError(err.message || 'Failed to get response from AI');
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'ai',
        content: `I'm having trouble connecting to the AI service. Please check your connection and try again. Error: ${err.message || 'Unknown error'}`,
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [inputValue, isLoading, hasStartedChat, apiCall, currentChatId]);

  // Optimized mouse move handler with throttling
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (window.innerWidth > 768 && isMountedRef.current) {
      setMousePosition({ x: e.clientX, y: e.clientY });
    }
  }, []);

  // Component mount/unmount tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('sally_token');
    const storedUser = localStorage.getItem('sally_user');
    if (storedToken && storedUser && isMountedRef.current) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('sally_token');
        localStorage.removeItem('sally_user');
      }
    }
  }, []);

  // Fetch wallet summary when user changes
  useEffect(() => {
    if (user && token && isMountedRef.current) {
      const fetchWalletSummary = async () => {
        try {
          const response = await apiCall('/wallet', 'GET');
          if (response && isMountedRef.current) {
            setWalletSummary({
              totalEquity: response.data?.totalEquity || '$0.00'
            });
          }
        } catch (error) {
          console.error('Failed to fetch wallet summary:', error);
        }
      };
      fetchWalletSummary();
    }
  }, [user, token, apiCall]);

  // Auto-scroll chat container
  useEffect(() => {
    if (chatContainerRef.current && isMountedRef.current) {
      const container = chatContainerRef.current;
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  }, [chatHistory]);

  // Smooth mouse animation with proper cleanup and fallback
  useEffect(() => {
    let animationId: number;
    
    const smoothen = () => {
      if (!isMountedRef.current) return;
      
      setSmoothMousePosition(current => ({
        x: current.x + (mousePosition.x - current.x) * 0.1,
        y: current.y + (mousePosition.y - current.y) * 0.1
      }));
      
      animationId = requestAnimationFrame(smoothen);
    };
    
    animationId = requestAnimationFrame(smoothen);
    mouseAnimationRef.current = animationId;
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      mouseAnimationRef.current = null;
    };
  }, [mousePosition]);

  // Event listeners with proper cleanup
  useEffect(() => {
    const handleScroll = () => {
      if (isMountedRef.current) {
        setIsScrolled(window.scrollY > 24);
      }
    };
    
    let throttleTimeout: NodeJS.Timeout | null = null;
    const throttledMouseMove = (e: MouseEvent) => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          if (isMountedRef.current) {
            handleMouseMove(e);
          }
          throttleTimeout = null;
        }, 16); // ~60fps
      }
    };
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause animations when tab is not visible
        if (mouseAnimationRef.current) {
          cancelAnimationFrame(mouseAnimationRef.current);
          mouseAnimationRef.current = null;
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', throttledMouseMove, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', throttledMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
    };
  }, [handleMouseMove]);

  // Ticker animation with proper cleanup
  useEffect(() => {
    const startTicker = () => {
      if (tickerIntervalRef.current) {
        clearInterval(tickerIntervalRef.current);
      }
      
      tickerIntervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          setCurrentTickerIndex(prev => (prev + (window.innerWidth < 640 ? 2 : 4)) % cryptoData.length);
        }
      }, 5000);
    };

    startTicker();

    return () => {
      if (tickerIntervalRef.current) {
        clearInterval(tickerIntervalRef.current);
        tickerIntervalRef.current = null;
      }
    };
  }, [cryptoData.length]);

  // Crypto price fetching with proper cleanup
  useEffect(() => {
    const fetchCryptoPrices = async () => {
      if (!isMountedRef.current) return;
      
      try {
        const coinIds = CRYPTO_COINS.map(coin => coin.coinId).join(',');
        const controller = new AbortController();
        
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`,
          { signal: controller.signal }
        );
        
        if (!response.ok) throw new Error('Failed to fetch crypto prices');
        const data = await response.json();
        
        if (isMountedRef.current) {
          setCryptoData(prevData =>
            prevData.map(coin => {
              const priceData = data[coin.coinId];
              return priceData ? {
                ...coin,
                price: priceData.usd || 0,
                change24h: priceData.usd_24h_change || 0,
                volume: formatNumber(priceData.usd_24h_vol || 0),
                marketCap: formatNumber(priceData.usd_market_cap || 0)
              } : coin;
            })
          );
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Failed to fetch crypto prices:', error);
        }
      }
    };

    // Initial fetch
    fetchCryptoPrices();
    
    // Set up interval
    priceIntervalRef.current = setInterval(fetchCryptoPrices, 30000);
    
    return () => {
      if (priceIntervalRef.current) {
        clearInterval(priceIntervalRef.current);
        priceIntervalRef.current = null;
      }
    };
  }, [formatNumber]);

  // Cleanup all resources on unmount
  useEffect(() => {
    return () => {
      // Cancel all ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Clear all intervals
      if (tickerIntervalRef.current) {
        clearInterval(tickerIntervalRef.current);
      }
      if (priceIntervalRef.current) {
        clearInterval(priceIntervalRef.current);
      }
      
      // Cancel animation frames
      if (mouseAnimationRef.current) {
        cancelAnimationFrame(mouseAnimationRef.current);
      }
    };
  }, []);

  // Mouse style for dynamic positioning with smooth animation and fallback
  const mouseStyle = {
    '--mouse-x': `${smoothMousePosition.x || window.innerWidth / 2}px`,
    '--mouse-y': `${smoothMousePosition.y || window.innerHeight / 2}px`,
  } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-black text-white font-inter antialiased overflow-hidden flex flex-col" style={mouseStyle}>
      {/* Viewport meta for mobile optimization */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
      
      {/* NEW: Chat Sidebar */}
      <ChatSidebar
        isOpen={showChatSidebar}
        onClose={() => setShowChatSidebar(false)}
        currentChatId={currentChatId}
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
        token={token || ''}
        apiBaseUrl={API_BASE_URL}
      />
      
      {/* Background Effects with Enhanced Mouse-Following Light and Fixed Fallback */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Base gradient background - always visible */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/30 to-black/70" />
        
        {/* Enhanced mouse-following glow effect with fallback position */}
        <div 
          className="absolute opacity-50 sm:opacity-70 transition-all duration-150 ease-out will-change-transform"
          style={{
            top: 'var(--mouse-y, 50vh)',
            left: 'var(--mouse-x, 50vw)',
            width: '700px',
            height: '700px',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(91, 163, 255, 0.3) 0%, rgba(91, 163, 255, 0.2) 20%, rgba(91, 163, 255, 0.15) 40%, transparent 65%)',
            filter: 'blur(100px)',
          }}
        />
        
        {/* Secondary enhanced glow for depth with fallback */}
        <div 
          className="absolute opacity-30 sm:opacity-50 transition-all duration-200 ease-out will-change-transform"
          style={{
            top: 'var(--mouse-y, 50vh)',
            left: 'var(--mouse-x, 50vw)',
            width: '900px',
            height: '900px',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, transparent 30%, rgba(91, 163, 255, 0.15) 45%, rgba(91, 163, 255, 0.08) 60%, transparent 75%)',
            filter: 'blur(150px)',
          }}
        />
        
        {/* Static background elements for better visibility */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Crypto Ticker Banner */}
      <CryptoTickerBar 
        cryptoData={cryptoData} 
        currentTickerIndex={currentTickerIndex} 
        onCoinClick={handleCoinClick} 
      />

      {/* Header */}
      <header className={`fixed top-12 sm:top-16 left-0 right-0 z-30 h-14 sm:h-18 transition-all duration-300 ${
        isScrolled ? 'backdrop-blur-lg bg-black/40 border-b border-white/20 shadow-md' : 'backdrop-blur-md'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-full flex items-center justify-between">
          <div className="text-xs sm:text-sm text-white/80">AI Financial Analysis</div>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* NEW: Menu Button for Chat History */}
            {user && (
              <button
                onClick={() => setShowChatSidebar(true)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Chat History"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            
            {/* Wallet Widget */}
            {user && (
              <motion.div className="flex items-center gap-2">
                <motion.div
                  className="bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg p-2 cursor-pointer hover:bg-gray-700/90 transition-colors"
                  onClick={() => setShowFullWallet(!showFullWallet)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="flex items-center space-x-2">
                    <WalletIcon className="w-4 h-4 text-blue-400" />
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Portfolio</div>
                      <div className="text-sm font-semibold text-white">{walletSummary.totalEquity}</div>
                    </div>
                  </div>
                </motion.div>
                
                {/* Add Deposit Button */}
                <motion.button
                  onClick={() => setShowDepositModal(true)}
                  className="px-3 py-2 bg-green-600/80 hover:bg-green-500/80 text-white text-xs font-medium rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Deposit
                </motion.button>
              </motion.div>
            )}
            
            {user ? (
              <>
                <span className="text-xs sm:text-sm text-white/80 hidden sm:inline">
                  Welcome, {user.username}
                </span>
                <button onClick={handleSignOut} className="btn-outline h-8 sm:h-9 px-3 sm:px-4 text-xs font-semibold">
                  Sign Out
                </button>
              </>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="btn-outline h-8 sm:h-9 px-3 sm:px-4 text-xs font-semibold">
                <span className="hidden sm:inline">Sign In / Register</span>
                <span className="sm:hidden">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Deposit Modal */}
      <AnimatePresence>
        {showDepositModal && user && (
          <DepositPage 
            apiCall={apiCall}
            onClose={() => setShowDepositModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Full Wallet Modal */}
      <AnimatePresence>
        {showFullWallet && user && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFullWallet(false)}
          >
            <motion.div
              className="bg-gray-900 border border-gray-700 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Portfolio Details</h2>
                <button
                  onClick={() => setShowFullWallet(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4">
                <Wallet token={token} apiCall={apiCall} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuth={handleAuth}
          isLogin={isLogin}
          setIsLogin={setIsLogin}
          authForm={authForm}
          setAuthForm={setAuthForm}
          isLoading={isLoading}
          error={error}
        />
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 pt-26 sm:pt-34 flex flex-col items-center justify-center relative z-10 px-4">
        <AnimatePresence mode="wait">
          {!hasStartedChat ? (
            <motion.div 
              key="initial-state" 
              className="flex flex-col items-center gap-4 text-center" 
              initial={{ opacity: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <motion.h1 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tighter"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.8) 100%)',
                  WebkitBackgroundClip: 'text', 
                  backgroundClip: 'text', 
                  color: 'transparent',
                }}
              >
                Sally AI
              </motion.h1>
              <motion.p 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
                className="text-base sm:text-lg text-white/80 max-w-xl px-4"
              >
                Your intelligent assistant for comprehensive market analysis. Ask anything about crypto trends, sentiment, and data.
              </motion.p>
            </motion.div>
          ) : (
            <motion.div 
              key="chat-state" 
              className="w-full h-full flex flex-col pt-16 sm:pt-24" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Chat Area */}
              <div 
                ref={chatContainerRef} 
                className="flex-1 w-full max-w-3xl mx-auto px-4 overflow-y-auto pb-4"
                style={{ minHeight: '200px' }} // Ensure minimum height
              >
                <AnimatePresence>
                  {chatHistory.map(msg => (
                    <ChatMessage 
                      key={msg.id} 
                      message={msg} 
                      formatMarkdown={formatMarkdown} 
                    />
                  ))}
                  {isLoading && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-4 sm:mb-6 flex justify-start"
                    >
                      <div className="inline-block bg-white/10 border border-white/20 rounded-2xl p-3 sm:p-4 backdrop-blur-md">
                        <div className="flex items-center gap-3 text-white/80">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                          </div>
                          <span className="text-sm">Sally is thinking...</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      {/* Input Form Area */}
      <footer className="w-full max-w-3xl mx-auto px-4 pb-6 sm:pb-8 z-20 mt-auto">
        <form onSubmit={handleAsk} className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder={user ? "Ask me anything about the crypto market..." : "Please sign in to start analyzing"}
            disabled={!user || isLoading}
            className="w-full bg-black/60 border border-white/30 rounded-xl h-12 sm:h-14 pl-4 sm:pl-5 pr-12 sm:pr-14 text-sm sm:text-base text-white placeholder-white/60 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all shadow-sm backdrop-blur-md"
          />
          <button 
            type="submit" 
            disabled={!user || !inputValue.trim() || isLoading} 
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            )}
          </button>
        </form>
        {error && !showAuthModal && (
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 text-sm text-center mt-2 bg-red-500/10 border border-red-500/20 rounded-lg p-2"
          >
            {error}
          </motion.p>
        )}
      </footer>

      {/* Global Styles */}
      <style jsx global>{`
        :root {
          --glow-blue-1: #5ba3ff;
          --glow-blue-2: #9cc7ff;
        }
        
        * {
          -webkit-tap-highlight-color: transparent;
          box-sizing: border-box;
        }
        
        html, body {
          -webkit-text-size-adjust: 100%;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          touch-action: manipulation;
          overscroll-behavior: none;
        }
        
        .btn-outline {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 999px;
          color: white;
          transition: all 0.2s ease-in-out;
          -webkit-touch-callout: none;
          user-select: none;
        }
        
        .btn-outline:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.6);
        }
        
        .auth-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 0.75rem;
          height: 2.5rem;
          padding-left: 2.5rem;
          padding-right: 1rem;
          color: white;
          transition: all 0.2s ease;
        }
        
        @media (min-width: 640px) {
          .auth-input {
            height: 3rem;
            padding-left: 3rem;
          }
        }
        
        .auth-input:focus {
          outline: none;
          border-color: #5ba3ff;
          box-shadow: 0 0 0 2px rgba(91, 163, 255, 0.5);
        }
        
        .prose p:first-child {
          margin-top: 0;
        }
        
        .prose p:last-child {
          margin-bottom: 0;
        }
        
        /* Enhanced smooth scrolling for chat */
        .overflow-y-auto {
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
        }
        
        .overflow-y-auto::-webkit-scrollbar {
          width: 4px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }
        
        /* Performance optimizations */
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: .5;
          }
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .will-change-transform {
          will-change: transform;
        }
        
        /* Enhanced Mobile optimizations */
        @media (max-width: 640px) {
          body {
            font-size: 14px;
            -webkit-text-size-adjust: 100%;
          }
          
          .font-inter {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          
          input, button, textarea {
            font-size: 16px; /* Prevents zoom on iOS */
          }
          
          /* Prevent zoom on double tap */
          * {
            touch-action: manipulation;
          }
        }
        
        /* Improved mobile touch targets */
        @media (max-width: 768px) {
          button, input, select, textarea {
            min-height: 44px; /* iOS recommended minimum */
          }
        }
        
        /* Enhanced mobile animations */
        @media (prefers-reduced-motion: reduce) {
          .animate-pulse,
          .animate-spin,
          .transition-all,
          .transition-transform,
          .transition-colors {
            animation: none;
            transition: none;
          }
        }
        
        /* Memory leak prevention */
        .will-change-transform {
          will-change: auto;
        }
        
        /* Force hardware acceleration cleanup */
        @media (max-width: 768px) {
          .will-change-transform {
            will-change: auto;
          }
        }

        /* Ensure minimum visibility */
        .bg-black {
          background-color: #000000 !important;
        }

        /* Better fallback backgrounds */
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
}

export default App;
