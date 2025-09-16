import React, { useState, useEffect, useCallback, memo } from 'react';
import { Wallet as WalletIcon, RefreshCw, TrendingUp, TrendingDown, Eye, EyeOff, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';



// --- INTERFACES ---
interface CoinBalance {
  coin: string;
  walletBalance: string;
  usdValue: string;
  equity: string;
  free: string;
  locked: string;
  unrealisedPnl: string;
  borrowAmount: string;
}

interface WalletData {
  totalEquity: string;
  totalAvailableBalance: string;
  totalWalletBalance: string;
  totalMarginBalance: string;
  accountType: string;
  coins: CoinBalance[];
  lastUpdated: string;
}

interface WalletApiResponse {
  success: boolean;
  data: WalletData;
  timestamp: string;
  error?: string;
}

// --- PROPS INTERFACE ---
interface WalletProps {
  token: string;
  apiCall: (endpoint: string, method: string, data?: any) => Promise<any>;
}

// --- UTILITY FUNCTIONS ---
const formatCurrency = (value: string | number, decimals: number = 2): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return '$0.00';
  
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  
  return `$${num.toLocaleString(undefined, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  })}`;
};

const formatCoinAmount = (amount: string, coin: string): string => {
  const num = parseFloat(amount);
  if (isNaN(num) || num === 0) return '0';
  
  // Different decimal places based on coin value
  const decimals = num < 0.01 ? 8 : num < 1 ? 6 : num < 100 ? 4 : 2;
  return num.toLocaleString(undefined, { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: decimals 
  });
};

// --- MEMOIZED COMPONENTS ---
const LoadingSpinner = memo(() => (
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    className="inline-block"
  >
    <RefreshCw className="w-5 h-5 text-blue-400" />
  </motion.div>
));

const CoinRow = memo(({ coin, isHidden }: { coin: CoinBalance; isHidden: boolean }) => {
  const hasValue = parseFloat(coin.usdValue) > 0.01;
  const hasUnrealizedPnl = parseFloat(coin.unrealisedPnl) !== 0;
  const pnlColor = parseFloat(coin.unrealisedPnl) >= 0 ? 'text-green-400' : 'text-red-400';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:border-blue-500/30 transition-all duration-300"
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">{coin.coin.slice(0, 2)}</span>
        </div>
        <div>
          <div className="font-semibold text-white">{coin.coin}</div>
          <div className="text-sm text-gray-400">
            {isHidden ? '••••••' : formatCoinAmount(coin.walletBalance, coin.coin)}
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <div className="font-semibold text-white">
          {isHidden ? '••••••' : formatCurrency(coin.usdValue)}
        </div>
        {hasUnrealizedPnl && (
          <div className={`text-sm flex items-center ${pnlColor}`}>
            {parseFloat(coin.unrealisedPnl) >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {isHidden ? '••••' : formatCurrency(coin.unrealisedPnl)}
          </div>
        )}
        {parseFloat(coin.locked) > 0 && (
          <div className="text-xs text-orange-400">
            Locked: {isHidden ? '••••' : formatCoinAmount(coin.locked, coin.coin)}
          </div>
        )}
      </div>
    </motion.div>
  );
});

// --- MAIN WALLET COMPONENT ---
const Wallet: React.FC<WalletProps> = ({ token, apiCall }) => {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHidden, setIsHidden] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch wallet data
  const fetchWalletData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const response: WalletApiResponse = await apiCall('/wallet', 'GET');
      setWalletData(response.data);
    } catch (err: any) {
      console.error('Wallet fetch error:', err);
      setError(err.message || 'Failed to fetch wallet data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [apiCall]);

  // Refresh wallet data
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWalletData(false);
  }, [fetchWalletData]);

  // Toggle balance visibility
  const toggleVisibility = useCallback(() => {
    setIsHidden(prev => !prev);
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (token) {
      fetchWalletData();
    }
  }, [token, fetchWalletData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!token) return;
    
    const interval = setInterval(() => {
      fetchWalletData(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [token, fetchWalletData]);

  if (!token) {
    return (
      <div className="text-center py-12">
        <WalletIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-400">Please sign in to view your wallet</p>
      </div>
    );
  }

  if (isLoading && !walletData) {
    return (
      <div className="text-center py-12">
        <LoadingSpinner />
        <p className="text-gray-400 mt-4">Loading wallet data...</p>
      </div>
    );
  }

  if (error && !walletData) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">⚠️ {error}</div>
        <button
          onClick={() => fetchWalletData()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!walletData) return null;

  const totalEquityNum = parseFloat(walletData.totalEquity);
  const hasPositiveBalance = totalEquityNum > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <WalletIcon className="w-8 h-8 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Portfolio</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleVisibility}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title={isHidden ? 'Show balances' : 'Hide balances'}
          >
            {isHidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh wallet data"
          >
            <motion.div
              animate={{ rotate: refreshing ? 360 : 0 }}
              transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: "linear" }}
            >
              <RefreshCw className="w-5 h-5" />
            </motion.div>
          </button>
        </div>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 p-6 rounded-2xl border border-blue-500/20"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Equity</span>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {isHidden ? '••••••••' : formatCurrency(walletData.totalEquity)}
          </div>
          <div className="text-xs text-gray-500 mt-1">{walletData.accountType}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 p-6 rounded-2xl border border-green-500/20"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Available</span>
            <ArrowUpRight className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {isHidden ? '••••••••' : formatCurrency(walletData.totalAvailableBalance)}
          </div>
          <div className="text-xs text-green-400 mt-1">Ready to Trade</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 p-6 rounded-2xl border border-purple-500/20"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Wallet Balance</span>
            <WalletIcon className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {isHidden ? '••••••••' : formatCurrency(walletData.totalWalletBalance)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {walletData.coins.length} Asset{walletData.coins.length !== 1 ? 's' : ''}
          </div>
        </motion.div>
      </div>

      {/* Assets List */}
      {walletData.coins.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 rounded-2xl border border-white/10 p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Your Assets</h3>
          <div className="space-y-3">
            <AnimatePresence>
              {walletData.coins.map((coin) => (
                <CoinRow key={coin.coin} coin={coin} isHidden={isHidden} />
              ))}
            </AnimatePresence>
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-500 text-center">
            Last updated: {new Date(walletData.lastUpdated).toLocaleString()}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 bg-white/5 rounded-2xl border border-white/10"
        >
          <WalletIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">No assets found</p>
          <p className="text-sm text-gray-500 mt-2">Deposit funds to get started</p>
        </motion.div>
      )}

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm"
          >
            ⚠️ {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default memo(Wallet);
