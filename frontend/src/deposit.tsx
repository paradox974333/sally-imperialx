// deposit.tsx
import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { X, Copy, ArrowLeft, AlertCircle, CheckCircle2, Loader2, Search, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code'; // npm install react-qr-code

// Match your existing interfaces pattern
interface Chain {
  chain: string;
  chainType: string;
  chainDeposit: string;
  chainWithdraw: string;
  withdrawFee: string;
  withdrawPercentageFee: string;
  depositMin: string;
  withdrawMin: string;
  minAccuracy: string;
  confirmation: string;
  safeConfirmNumber: string;
  contractAddress: string;
}

interface CoinOption {
  coin: string;
  name: string;
  remainAmount: string;
  chains: Chain[];
}

interface DepositAddress {
  coin: string;
  chains: {
    chainType: string;
    addressDeposit: string;
    tagDeposit: string;
    chain: string;
    batchReleaseLimit: string;
    contractAddress: string;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  error?: string;
}

interface DepositPageProps {
  apiCall: (endpoint: string, method: 'GET' | 'POST', body?: any) => Promise<any>;
  onClose: () => void;
}

const LoadingSpinner = memo(() => (
  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
));

const CopyButton = memo(({ 
  text, 
  label 
}: { 
  text: string; 
  label: string; 
}) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [text]);

  return (
    <button
      onClick={copyToClipboard}
      className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600/80 hover:bg-blue-500/80 text-white rounded-lg transition-colors"
    >
      {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
      {copied ? 'Copied!' : `Copy ${label}`}
    </button>
  );
});

// QR Code Modal Component - Fixed version
const QRModal = memo(({ 
  address, 
  coin, 
  chainType, 
  isOpen, 
  onClose 
}: {
  address: string;
  coin: string;
  chainType: string;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [qrError, setQrError] = useState(false);
  const [qrLoading, setQrLoading] = useState(true);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setQrError(false);
      setQrLoading(true);
      // Simulate QR generation time
      const timer = setTimeout(() => setQrLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-black/95 border border-white/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Deposit QR Code</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} className="text-white/80" />
          </button>
        </div>
        
        {/* QR Code Container */}
        <div className="bg-white p-4 rounded-xl mb-4 flex justify-center items-center min-h-[232px]">
          {qrLoading ? (
            <div className="flex flex-col items-center gap-2">
              <LoadingSpinner />
              <span className="text-sm text-gray-600">Generating QR Code...</span>
            </div>
          ) : qrError ? (
            <div className="flex flex-col items-center gap-2 text-red-500">
              <AlertCircle size={32} />
              <span className="text-sm">Failed to generate QR code</span>
            </div>
          ) : (
            <div className="flex justify-center">
              <QRCode 
                value={address} 
                size={200}
                level="M"
                includeMargin={true}
                onError={() => setQrError(true)}
                style={{
                  height: "auto",
                  maxWidth: "100%",
                  width: "100%"
                }}
              />
            </div>
          )}
        </div>
        
        <div className="text-center">
          <p className="text-sm text-white/70 mb-2">
            Scan to send <span className="text-blue-400 font-medium">{coin}</span> via <span className="text-blue-400 font-medium">{chainType}</span>
          </p>
          <div className="text-xs text-white/50 break-all bg-white/5 p-3 rounded-lg border border-white/10">
            {address}
          </div>
          <div className="mt-3">
            <CopyButton text={address} label="Address" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

const DepositPage: React.FC<DepositPageProps> = ({ apiCall, onClose }) => {
  // State management matching your app's patterns
  const [coinOptions, setCoinOptions] = useState<CoinOption[]>([]);
  const [allCoins, setAllCoins] = useState<CoinOption[]>([]); // Store all coins for search
  const [selectedCoin, setSelectedCoin] = useState<string>('');
  const [selectedChain, setSelectedChain] = useState<string>('');
  const [availableChains, setAvailableChains] = useState<Chain[]>([]);
  const [depositAddress, setDepositAddress] = useState<DepositAddress | null>(null);
  const [loading, setLoading] = useState({
    coinInfo: false,
    depositAddress: false,
    loadingMore: false
  });
  const [error, setError] = useState<string>('');
  
  // New state for search and batch loading
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [displayedCoinsCount, setDisplayedCoinsCount] = useState<number>(50); // Initial batch size
  const [showQRModal, setShowQRModal] = useState<boolean>(false);

  // Batch loading configuration
  const BATCH_SIZE = 50;
  const MAX_INITIAL_LOAD = 100;

  // Memoized filtered and paginated coins
  const filteredAndPaginatedCoins = useMemo(() => {
    let filtered = allCoins;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = allCoins.filter(coin => 
        coin.coin.toLowerCase().includes(search) || 
        coin.name.toLowerCase().includes(search)
      );
    }
    
    // Apply pagination
    return filtered.slice(0, displayedCoinsCount);
  }, [allCoins, searchTerm, displayedCoinsCount]);

  const hasMoreCoins = useMemo(() => {
    const totalFiltered = searchTerm.trim() 
      ? allCoins.filter(coin => 
          coin.coin.toLowerCase().includes(searchTerm.toLowerCase()) || 
          coin.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).length
      : allCoins.length;
    
    return displayedCoinsCount < totalFiltered;
  }, [allCoins, searchTerm, displayedCoinsCount]);

  // Load more coins
  const loadMoreCoins = useCallback(() => {
    if (!hasMoreCoins || loading.loadingMore) return;
    
    setLoading(prev => ({ ...prev, loadingMore: true }));
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      setDisplayedCoinsCount(prev => prev + BATCH_SIZE);
      setLoading(prev => ({ ...prev, loadingMore: false }));
    }, 300);
  }, [hasMoreCoins, loading.loadingMore]);

  // Fetch coin info on component mount
  const fetchCoinInfo = useCallback(async (): Promise<void> => {
    setLoading(prev => ({ ...prev, coinInfo: true }));
    setError('');

    try {
      const result: ApiResponse<CoinOption[]> = await apiCall('/deposit/coin-info', 'GET');
      setAllCoins(result.data);
      setCoinOptions(result.data.slice(0, MAX_INITIAL_LOAD)); // Initial batch
      setDisplayedCoinsCount(Math.min(MAX_INITIAL_LOAD, result.data.length));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch coin information');
    } finally {
      setLoading(prev => ({ ...prev, coinInfo: false }));
    }
  }, [apiCall]);

  const fetchDepositAddress = useCallback(async (): Promise<void> => {
    if (!selectedCoin || !selectedChain) return;

    setLoading(prev => ({ ...prev, depositAddress: true }));
    setError('');

    try {
      const result: ApiResponse<DepositAddress> = await apiCall(
        `/deposit/address?coin=${selectedCoin}&chain=${selectedChain}`, 
        'GET'
      );
      setDepositAddress(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deposit address');
      setDepositAddress(null);
    } finally {
      setLoading(prev => ({ ...prev, depositAddress: false }));
    }
  }, [selectedCoin, selectedChain, apiCall]);

  // Handle search input changes
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setDisplayedCoinsCount(BATCH_SIZE); // Reset to initial batch size when searching
  }, []);

  // Effects
  useEffect(() => {
    fetchCoinInfo();
  }, [fetchCoinInfo]);

  useEffect(() => {
    if (selectedCoin) {
      const coin = allCoins.find(c => c.coin === selectedCoin);
      setAvailableChains(coin?.chains || []);
      setSelectedChain('');
      setDepositAddress(null);
    } else {
      setAvailableChains([]);
      setSelectedChain('');
      setDepositAddress(null);
    }
  }, [selectedCoin, allCoins]);

  useEffect(() => {
    if (selectedCoin && selectedChain) {
      fetchDepositAddress();
    }
  }, [selectedCoin, selectedChain, fetchDepositAddress]);

  const getChainDisplayName = useCallback((chain: Chain): string => {
    return `${chain.chainType} (${chain.chain})`;
  }, []);

  // Handle QR modal with proper address validation
  const handleShowQRModal = useCallback(() => {
    if (depositAddress?.chains?.addressDeposit) {
      setShowQRModal(true);
    }
  }, [depositAddress]);

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-black/95 border border-white/30 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/20">
            <div className="flex items-center gap-3">
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-white/80" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white">Deposit Funds</h2>
                <p className="text-sm text-white/60">Add cryptocurrency to your wallet</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} className="text-white/80" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* Error Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 bg-red-600/20 border border-red-600/30 text-red-300 px-4 py-3 rounded-xl mb-6"
                >
                  <AlertCircle size={16} />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 1: Select Coin with Search */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-3">
                Step 1: Select Cryptocurrency
              </label>
              
              {/* Search Input */}
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
                <input
                  type="text"
                  placeholder="Search cryptocurrencies..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full bg-white/10 border border-white/30 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/50 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                />
              </div>

              {/* Coin Selection Dropdown */}
              <select
                value={selectedCoin}
                onChange={(e) => setSelectedCoin(e.target.value)}
                disabled={loading.coinInfo}
                className="w-full bg-white/10 border border-white/30 rounded-xl p-3 text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
              >
                <option value="" className="bg-gray-800">
                  {loading.coinInfo ? 'Loading coins...' : 'Select a cryptocurrency'}
                </option>
                {filteredAndPaginatedCoins.map((coin) => (
                  <option key={coin.coin} value={coin.coin} className="bg-gray-800">
                    {coin.name} ({coin.coin})
                  </option>
                ))}
              </select>

              {/* Load More Button */}
              {hasMoreCoins && (
                <div className="mt-3 text-center">
                  <button
                    onClick={loadMoreCoins}
                    disabled={loading.loadingMore}
                    className="flex items-center gap-2 mx-auto px-4 py-2 text-sm bg-white/10 hover:bg-white/20 disabled:bg-white/5 text-white/80 rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {loading.loadingMore ? (
                      <>
                        <LoadingSpinner />
                        Loading more...
                      </>
                    ) : (
                      `Load more coins (${allCoins.length - displayedCoinsCount} remaining)`
                    )}
                  </button>
                </div>
              )}

              {/* Search Results Info */}
              {searchTerm && (
                <div className="mt-2 text-xs text-white/60">
                  {filteredAndPaginatedCoins.length} results found
                  {searchTerm && allCoins.filter(coin => 
                    coin.coin.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    coin.name.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length > displayedCoinsCount && ` (showing first ${displayedCoinsCount})`}
                </div>
              )}
            </div>

            {/* Step 2: Select Chain */}
            {selectedCoin && availableChains.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <label className="block text-sm font-medium text-white mb-3">
                  Step 2: Select Network/Chain
                </label>
                <select
                  value={selectedChain}
                  onChange={(e) => setSelectedChain(e.target.value)}
                  className="w-full bg-white/10 border border-white/30 rounded-xl p-3 text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                >
                  <option value="" className="bg-gray-800">Select a network</option>
                  {availableChains
                    .filter(chain => chain.chainDeposit === '1')
                    .map((chain) => (
                      <option key={chain.chain} value={chain.chain} className="bg-gray-800">
                        {getChainDisplayName(chain)}
                      </option>
                    ))}
                </select>

                {/* Chain Information */}
                {selectedChain && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 p-3 bg-white/5 border border-white/10 rounded-xl"
                  >
                    {(() => {
                      const chain = availableChains.find(c => c.chain === selectedChain);
                      if (!chain) return null;
                      return (
                        <div className="text-sm text-white/70 space-y-1">
                          <p><strong className="text-white">Min Deposit:</strong> {chain.depositMin} {selectedCoin}</p>
                          <p><strong className="text-white">Confirmations:</strong> {chain.confirmation}</p>
                          <p><strong className="text-white">Safe Confirmations:</strong> {chain.safeConfirmNumber}</p>
                          {chain.contractAddress && (
                            <p><strong className="text-white">Contract:</strong> ...{chain.contractAddress.slice(-8)}</p>
                          )}
                        </div>
                      );
                    })()}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step 3: Deposit Address */}
            {selectedCoin && selectedChain && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <label className="block text-sm font-medium text-white mb-3">
                  Step 3: Deposit Address
                </label>
                
                {loading.depositAddress ? (
                  <div className="flex items-center justify-center p-8 bg-white/5 border border-white/10 rounded-xl">
                    <LoadingSpinner />
                    <span className="ml-3 text-white/80">Generating deposit address...</span>
                  </div>
                ) : depositAddress ? (
                  <div className="space-y-4">
                    {/* Deposit Address */}
                    <div className="p-4 bg-green-600/20 border border-green-600/30 rounded-xl">
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-sm font-medium text-green-300">Deposit Address:</label>
                        <div className="flex gap-2">
                          <button
                            onClick={handleShowQRModal}
                            disabled={!depositAddress.chains.addressDeposit}
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-green-600/80 hover:bg-green-500/80 disabled:bg-gray-600/50 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                          >
                            <QrCode size={12} />
                            QR Code
                          </button>
                          <CopyButton text={depositAddress.chains.addressDeposit} label="Address" />
                        </div>
                      </div>
                      <div className="font-mono text-sm bg-black/40 p-3 rounded-lg border border-white/10 text-white break-all">
                        {depositAddress.chains.addressDeposit}
                      </div>
                    </div>

                    {/* Tag/Memo if present */}
                    {depositAddress.chains.tagDeposit && (
                      <div className="p-4 bg-yellow-600/20 border border-yellow-600/30 rounded-xl">
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-sm font-medium text-yellow-300">Memo/Tag:</label>
                          <CopyButton text={depositAddress.chains.tagDeposit} label="Memo" />
                        </div>
                        <div className="font-mono text-sm bg-black/40 p-3 rounded-lg border border-white/10 text-white">
                          {depositAddress.chains.tagDeposit}
                        </div>
                      </div>
                    )}

                    {/* Important Notices */}
                    <div className="p-4 bg-blue-600/20 border border-blue-600/30 rounded-xl">
                      <h4 className="flex items-center gap-2 font-medium text-blue-300 mb-3">
                        <AlertCircle size={16} />
                        Important Notice
                      </h4>
                      <ul className="text-sm text-blue-200 space-y-2">
                        <li>• Only send <strong>{selectedCoin}</strong> to this address via <strong>{depositAddress.chains.chainType}</strong> network</li>
                        <li>• Minimum deposit: <strong>{availableChains.find(c => c.chain === selectedChain)?.depositMin} {selectedCoin}</strong></li>
                        <li>• Funds will be credited after <strong>{availableChains.find(c => c.chain === selectedChain)?.confirmation}</strong> network confirmations</li>
                        {depositAddress.chains.tagDeposit && (
                          <li>• <strong>MUST include the memo/tag</strong> or your deposit may be lost</li>
                        )}
                      </ul>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            )}

            {/* Refresh Button */}
            <div className="flex justify-center mt-8">
              <button
                onClick={fetchCoinInfo}
                disabled={loading.coinInfo}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600/80 hover:bg-blue-500/80 disabled:bg-gray-600/50 text-white rounded-xl transition-colors disabled:cursor-not-allowed"
              >
                {loading.coinInfo ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading.coinInfo ? 'Refreshing...' : 'Refresh Coin List'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRModal && depositAddress?.chains?.addressDeposit && (
          <QRModal
            address={depositAddress.chains.addressDeposit}
            coin={selectedCoin}
            chainType={depositAddress.chains.chainType}
            isOpen={showQRModal}
            onClose={() => setShowQRModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default DepositPage;
