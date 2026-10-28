import React, { useState, useEffect } from 'react';
import { checkTransactions } from '../services/transactionService1.js';
import { LoadingSpinner } from './LoadingSpinner';
import { validateWalletAddress } from '../utils/validation';
import { useToast } from '../hooks/useToast';
import { supabase } from '../utils/supabase1.js';
import { getUserSettings } from '../utils/api';

const UserDashboard = ({ user }) => {
  const [watchlist, setWatchlist] = useState([]);
  const [newToken, setNewToken] = useState('');
  const [trackedWallets, setTrackedWallets] = useState([]);
  const [walletTransactions, setWalletTransactions] = useState({});
  const [loading, setLoading] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedWallet, setSelectedWallet] = useState(null);
  const { showSuccess, showError } = useToast();

  // Mock plan data - In production, this should come from your backend
  const userPlan = {
    name: 'Pro Plan',
    price: '$30/month',
    features: [
      'Track up to 6 wallets',
      'Real-time notifications',
      'Priority support',
      'Advanced analytics'
    ]
  };

  useEffect(() => {
    if (user?.email) {
      loadUserData();
    }
  }, [user?.email]);

  const loadUserData = async () => {
    try {
      const settings = await getUserSettings(user.email);
      if (settings) {
        setTrackedWallets(settings.wallets || []);
      }

      const { data: watchlistData, error: watchlistError } = await supabase
        .from('watchlist')
        .select('token_address')
        .eq('user_id', user.id);

      if (watchlistError) throw watchlistError;
      
      setWatchlist(watchlistData?.map(item => item.token_address) || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      showError(error.message || 'Failed to load user data');
      setLoading(false);
    }
  };

  const handleViewChange = (view) => {
    setActiveView(view);
    setIsPanelOpen(false); // Close panel when view changes
  };

  const addToWatchlist = async () => {
    if (!validateWalletAddress(newToken)) {
      showError('Please enter a valid token address');
      return;
    }
    
    if (watchlist.includes(newToken)) {
      showError('Token already in watchlist');
      return;
    }

    try {
      const { error } = await supabase
        .from('watchlist')
        .insert([
          {
            user_id: user.id,
            token_address: newToken
          }
        ]);

      if (error) throw error;

      setWatchlist([...watchlist, newToken]);
      setNewToken('');
      showSuccess('Token added to watchlist');
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      showError('Failed to add token to watchlist');
    }
  };

  const removeFromWatchlist = async (token) => {
    try {
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('token_address', token);

      if (error) throw error;

      setWatchlist(watchlist.filter(t => t !== token));
      showSuccess('Token removed from watchlist');
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      showError('Failed to remove token from watchlist');
    }
  };

  const loadWalletTransactions = async (wallet) => {
    setSelectedWallet(wallet);
    try {
      const transactions = await checkTransactions(wallet.address);
      setWalletTransactions(prev => ({
        ...prev,
        [wallet.address]: transactions.slice(0, 5) // Get last 5 transactions
      }));
    } catch (error) {
      console.error('Error loading transactions:', error);
      showError(`Failed to load transactions for ${wallet.address}`);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const renderMainContent = () => {
    switch (activeView) {
      case 'watchlist':
        return (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-primary mb-6">Token Watchlist</h2>
            <div className="flex gap-4 mb-6">
              <input
                type="text"
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
                placeholder="Enter token address (0x...)"
                className="flex-1 px-4 py-2 rounded-lg border border-primary/10 bg-background text-primary"
              />
              <button
                onClick={addToWatchlist}
                className="px-4 py-2 bg-primary text-background rounded-lg hover:bg-primary-hover"
              >
                Add Token
              </button>
            </div>
            <div className="space-y-4">
              {watchlist.map((token) => (
                <div key={token} className="flex justify-between items-center p-4 bg-background-secondary rounded-lg">
                  <span className="font-mono text-primary">{token}</span>
                  <button
                    onClick={() => removeFromWatchlist(token)}
                    className="text-red-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {watchlist.length === 0 && (
                <p className="text-center text-primary/60">No tokens in watchlist</p>
              )}
            </div>
          </div>
        );

      case 'plan':
        return (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-primary mb-6">Current Plan</h2>
            <div className="bg-background rounded-lg p-6 border border-primary/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-primary">{userPlan.name}</h3>
                  <p className="text-primary/60">{userPlan.price}</p>
                </div>
              </div>
              <ul className="space-y-2">
                {userPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-primary/80">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 'wallets':
        return (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-primary mb-6">Tracked Wallets</h2>
            <div className="space-y-4">
              {trackedWallets.map((wallet) => (
                <div key={wallet.address} className="border border-primary/10 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono text-primary">{wallet.address}</span>
                    <button
                      onClick={() => loadWalletTransactions(wallet)}
                      className="text-primary hover:text-primary-hover"
                    >
                      View Transactions
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-primary mb-6">Dashboard Overview</h2>
            <p className="text-primary/80">Select an option from the menu to view detailed information.</p>
          </div>
        );
    }
  };

  return (
    <div className="relative min-h-screen bg-background">
      {/* Menu Toggle Icon */}
      <button 
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className="fixed top-24 left-0 transform bg-primary text-background p-2 rounded-r-lg z-40 hover:bg-primary-hover transition-colors duration-200"
      >
        <svg 
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isPanelOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          )}
        </svg>
      </button>

      {/* Side Panel */}
      <div
        className={`fixed top-16 left-0 h-full w-64 bg-background shadow-xl transform transition-transform duration-300 z-30 ${
          isPanelOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Panel Content with Scrollbar */}
        <div className="h-full overflow-y-auto" style={{ paddingTop: '64px' }}>
          <div className="p-4 space-y-2">
            <button
              onClick={() => handleViewChange('watchlist')}
              className={`w-full text-left px-4 py-2 rounded-lg ${
                activeView === 'watchlist' ? 'bg-primary text-background' : 'text-primary hover:bg-background-secondary'
              }`}
            >
              Token Watchlist
            </button>
            <button
              onClick={() => handleViewChange('plan')}
              className={`w-full text-left px-4 py-2 rounded-lg ${
                activeView === 'plan' ? 'bg-primary text-background' : 'text-primary hover:bg-background-secondary'
              }`}
            >
              Current Plan
            </button>
            <button
              onClick={() => handleViewChange('wallets')}
              className={`w-full text-left px-4 py-2 rounded-lg ${
                activeView === 'wallets' ? 'bg-primary text-background' : 'text-primary hover:bg-background-secondary'
              }`}
            >
              Tracked Wallets
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${isPanelOpen ? 'ml-64' : 'ml-0'}`} style={{ marginTop: '64px' }}>
        {renderMainContent()}
      </div>

      {/* Transaction Modal */}
      {selectedWallet && walletTransactions[selectedWallet.address] && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" style={{ marginTop: '64px' }}>
          <div className="bg-background rounded-lg p-6 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-primary">
                Transactions for {selectedWallet.address}
              </h3>
              <button
                onClick={() => setSelectedWallet(null)}
                className="text-primary/60 hover:text-primary"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              {walletTransactions[selectedWallet.address].map((tx, index) => (
                <div key={tx.hash} className="bg-background-secondary p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-primary/60">Hash</p>
                      <p className="font-mono text-primary truncate">{tx.hash}</p>
                    </div>
                    <div>
                      <p className="text-sm text-primary/60">Value</p>
                      <p className="text-primary">{tx.value} ETH</p>
                    </div>
                    <div>
                      <p className="text-sm text-primary/60">From</p>
                      <p className="font-mono text-primary truncate">{tx.from}</p>
                    </div>
                    <div>
                      <p className="text-sm text-primary/60">To</p>
                      <p className="font-mono text-primary truncate">{tx.to}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-primary/60">Time</p>
                      <p className="text-primary">
                        {new Date(tx.timeStamp * 1000).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;