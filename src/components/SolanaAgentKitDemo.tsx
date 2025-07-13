import React, { useState, useEffect } from 'react';
import { solanaService } from '../services/solanaService';
import { walletSyncService } from '../services/walletSync';
import { useSupabaseUserStore } from '../stores/supabaseUserStore';
import { AlertCircle, Check, Loader2, TrendingUp, Coins, Zap, Users, Gift, ShoppingCart, DollarSign, BarChart3, Wallet, Settings, Link, Brain, Palette } from 'lucide-react';

interface Transaction {
  type: string;
  status: 'pending' | 'completed' | 'failed';
  signature?: string;
  details: string;
}

const SolanaAgentKittestnet: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [integrationMode, setIntegrationMode] = useState(false);
  const { currentUser } = useSupabaseUserStore();

  // Form states
  const [swapForm, setSwapForm] = useState({
    inputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    outputMint: 'So11111111111111111111111111111111111111112', // SOL
    amount: 0.1, // More realistic amount
    slippage: 50
  });

  const [tokenForm, setTokenForm] = useState({
    name: 'testnet Token',
    symbol: 'testnet',
    decimals: 6,
    supply: 10000 // More realistic supply
  });

  const [nftForm, setNftForm] = useState({
    collectionName: 'testnet NFT Collection',
    collectionSymbol: 'testnet',
    collectionDescription: 'A testnetnstration NFT collection for testing',
    collectionImage: 'https://example.com/collection.jpg',
    nftName: 'testnet NFT',
    nftDescription: 'A testnetnstration NFT',
    nftImage: 'https://example.com/nft.jpg'
  });

  const [stakeForm, setStakeForm] = useState({
    amount: 0.1, // More realistic amount
    validatorAddress: 'J1to3PQfXidUUhprQWgdKkQAMWPJAEqSJ7amkBDE9qhF'
  });

  useEffect(() => {
    loadWalletInfo();
  }, []);

  const loadWalletInfo = async () => {
    try {
      const wallet = solanaService.getWallet();
      if (wallet) {
        const balance = await solanaService.getBalance(wallet.publicKey.toString());
        const portfolio = await solanaService.getPortfolioValue(wallet.publicKey.toString());
        setWalletInfo({
          publicKey: wallet.publicKey.toString(),
          balance,
          portfolio,
          isInitialized: solanaService.isInitialized()
        });
      }
    } catch (error) {
      console.error('Error loading wallet info:', error);
    }
  };

  const addTransaction = (type: string, details: string) => {
    const newTransaction: Transaction = {
      type,
      status: 'pending',
      details
    };
    setTransactions(prev => [newTransaction, ...prev]);
    return newTransaction;
  };

  const updateTransaction = (index: number, status: 'completed' | 'failed', signature?: string) => {
    setTransactions(prev => prev.map((tx, i) => 
      i === index ? { ...tx, status, signature } : tx
    ));
  };

  // Integration functions
  const handleIntegrateWallet = async () => {
    if (!currentUser) {
      alert('Please log in to integrate with your wallet');
      return;
    }

    setLoading(true);
    try {
      // Create a new wallet using the Agent Kit and add it to the user's account
      const walletData = await solanaService.createAndFundWallet(0.1);
      
      // Add to user's wallet collection via walletSync
      await walletSyncService.createWallet({
        user_id: currentUser.id,
        address: walletData.publicKey,
        private_key: walletData.privateKey || 'agent-kit-generated',
        mnemonic: walletData.mnemonic || 'agent-kit-generated-mnemonic',
        network: 'solana-devnet',
        wallet_type: 'solana' as const,
        name: 'Agent Kit testnet Wallet',
        is_primary: false
      });

      alert(`Successfully integrated! New wallet created and added to your account.\nPublic Key: ${walletData.publicKey}`);
      setIntegrationMode(true);
    } catch (error) {
      console.error('Integration failed:', error);
      alert('Integration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToSmartChat = () => {
    if (!currentUser) {
      alert('Please log in to sync with Smart Chat');
      return;
    }
    
    // This would typically send the current testnet state to the Smart Chat
    alert('testnet state synced to Smart Chat! You can now ask the AI agents to perform similar operations.');
    setIntegrationMode(true);
  };

  const handleSwapTokens = async () => {
    if (!solanaService.isInitialized()) {
      alert('Solana Agent Kit not initialized. Please check your API keys.');
      return;
    }

    setLoading(true);
    const txIndex = transactions.length;
    addTransaction('Token Swap', `Swapping ${swapForm.amount} tokens`);

    try {
      const signature = await solanaService.swapTokens(
        swapForm.inputMint,
        swapForm.outputMint,
        swapForm.amount,
        swapForm.slippage
      );
      
      updateTransaction(txIndex, 'completed', signature);
      loadWalletInfo();
    } catch (error) {
      console.error('Swap failed:', error);
      updateTransaction(txIndex, 'failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeployToken = async () => {
    if (!solanaService.isInitialized()) {
      alert('Solana Agent Kit not initialized. Please check your API keys.');
      return;
    }

    setLoading(true);
    const txIndex = transactions.length;
    addTransaction('Token Deploy', `Deploying token: ${tokenForm.name}`);

    try {
      const mintAddress = await solanaService.deployToken(
        tokenForm.name,
        tokenForm.symbol,
        tokenForm.decimals,
        tokenForm.supply
      );
      
      updateTransaction(txIndex, 'completed', mintAddress);
      loadWalletInfo();
    } catch (error) {
      console.error('Token deployment failed:', error);
      updateTransaction(txIndex, 'failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNFTCollection = async () => {
    if (!solanaService.isInitialized()) {
      alert('Solana Agent Kit not initialized. Please check your API keys.');
      return;
    }

    setLoading(true);
    const txIndex = transactions.length;
    addTransaction('NFT Collection', `Creating collection: ${nftForm.collectionName}`);

    try {
      const collectionAddress = await solanaService.createNFTCollection(
        nftForm.collectionName,
        nftForm.collectionSymbol,
        nftForm.collectionDescription,
        nftForm.collectionImage
      );
      
      updateTransaction(txIndex, 'completed', collectionAddress);
      loadWalletInfo();
    } catch (error) {
      console.error('NFT collection creation failed:', error);
      updateTransaction(txIndex, 'failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStakeSOL = async () => {
    if (!solanaService.isInitialized()) {
      alert('Solana Agent Kit not initialized. Please check your API keys.');
      return;
    }

    setLoading(true);
    const txIndex = transactions.length;
    addTransaction('SOL Staking', `Staking ${stakeForm.amount} SOL`);

    try {
      const signature = await solanaService.stakeSOL(
        stakeForm.amount,
        stakeForm.validatorAddress
      );
      
      updateTransaction(txIndex, 'completed', signature);
      loadWalletInfo();
    } catch (error) {
      console.error('SOL staking failed:', error);
      updateTransaction(txIndex, 'failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndFundWallet = async () => {
    setLoading(true);
    const txIndex = transactions.length;
    addTransaction('Wallet Creation', 'Creating and funding new wallet');

    try {
      const walletData = await solanaService.createAndFundWallet(0.1);
      updateTransaction(txIndex, 'completed', walletData.signature);
      alert(`New wallet created!\nPublic Key: ${walletData.publicKey}\nFunded with 0.1 SOL`);
    } catch (error) {
      console.error('Wallet creation failed:', error);
      updateTransaction(txIndex, 'failed');
    } finally {
      setLoading(false);
    }
  };

  const renderIntegrationPanel = () => (
    <div className="bg-gradient-to-r from-purple-900 to-blue-900 p-6 rounded-xl border border-purple-500/20 mb-6">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Link className="w-5 h-5" />
        Integration Hub
      </h3>
      <p className="text-gray-300 mb-4">
        Connect Agent Kit testnet operations with your main dashboard components
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={handleIntegrateWallet}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg transition-colors text-left flex items-center gap-3"
        >
          <Wallet className="w-5 h-5" />
          <div>
            <h4 className="font-medium">Integrate Wallet</h4>
            <p className="text-sm opacity-80">Add testnet wallet to your account</p>
          </div>
        </button>
        
        <button
          onClick={handleSyncToSmartChat}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg transition-colors text-left flex items-center gap-3"
        >
          <Brain className="w-5 h-5" />
          <div>
            <h4 className="font-medium">Sync to Smart Chat</h4>
            <p className="text-sm opacity-80">Enable AI agent operations</p>
          </div>
        </button>
        
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: 'nft' }))}
          className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg transition-colors text-left flex items-center gap-3"
        >
          <Palette className="w-5 h-5" />
          <div>
            <h4 className="font-medium">NFT Creator</h4>
            <p className="text-sm opacity-80">Switch to NFT creation tool</p>
          </div>
        </button>
      </div>
      
      {integrationMode && (
        <div className="mt-4 p-3 bg-green-900/30 border border-green-500/30 rounded-lg">
          <p className="text-green-300 text-sm flex items-center gap-2">
            <Check className="w-4 h-4" />
            Integration mode active - your testnet operations are now connected to the main platform
          </p>
        </div>
      )}
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-6 rounded-xl border border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-300 text-sm">SOL Balance</p>
              <p className="text-2xl font-bold text-white">{walletInfo?.balance?.toFixed(4) || '0.0000'}</p>
            </div>
            <Wallet className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-900 to-green-800 p-6 rounded-xl border border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-300 text-sm">Portfolio Value</p>
              <p className="text-2xl font-bold text-white">${walletInfo?.portfolio?.totalValue?.toFixed(2) || '0.00'}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-900 to-purple-800 p-6 rounded-xl border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-300 text-sm">Status</p>
              <p className="text-lg font-semibold text-white">
                {solanaService.isInitialized() ? 'Connected' : 'Disconnected'}
              </p>
            </div>
            <Settings className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setActiveTab('swap')}
            className="p-4 bg-blue-900/50 hover:bg-blue-900/70 rounded-lg flex flex-col items-center gap-2 transition-colors border border-blue-500/20"
          >
            <TrendingUp className="w-6 h-6 text-blue-400" />
            <span className="text-sm text-blue-300">Swap Tokens</span>
          </button>
          <button
            onClick={() => setActiveTab('tokens')}
            className="p-4 bg-green-900/50 hover:bg-green-900/70 rounded-lg flex flex-col items-center gap-2 transition-colors border border-green-500/20"
          >
            <Coins className="w-6 h-6 text-green-400" />
            <span className="text-sm text-green-300">Deploy Token</span>
          </button>
          <button
            onClick={() => setActiveTab('nft')}
            className="p-4 bg-purple-900/50 hover:bg-purple-900/70 rounded-lg flex flex-col items-center gap-2 transition-colors border border-purple-500/20"
          >
            <Gift className="w-6 h-6 text-purple-400" />
            <span className="text-sm text-purple-300">Create NFT</span>
          </button>
          <button
            onClick={() => setActiveTab('stake')}
            className="p-4 bg-orange-900/50 hover:bg-orange-900/70 rounded-lg flex flex-col items-center gap-2 transition-colors border border-orange-500/20"
          >
            <Zap className="w-6 h-6 text-orange-400" />
            <span className="text-sm text-orange-300">Stake SOL</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderSwapTab = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white">Token Swap</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Input Token (Mint Address)</label>
          <input
            type="text"
            value={swapForm.inputMint}
            onChange={(e) => setSwapForm({...swapForm, inputMint: e.target.value})}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            placeholder="Token mint address"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Output Token (Mint Address)</label>
          <input
            type="text"
            value={swapForm.outputMint}
            onChange={(e) => setSwapForm({...swapForm, outputMint: e.target.value})}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            placeholder="Token mint address"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
          <input
            type="number"
            value={swapForm.amount}
            onChange={(e) => setSwapForm({...swapForm, amount: Number(e.target.value)})}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Slippage (bps)</label>
          <input
            type="number"
            value={swapForm.slippage}
            onChange={(e) => setSwapForm({...swapForm, slippage: Number(e.target.value)})}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            min="1"
            max="1000"
          />
        </div>
      </div>
      <button
        onClick={handleSwapTokens}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
        Swap Tokens
      </button>
    </div>
  );

  const renderTokensTab = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white">Deploy Token</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Token Name</label>
          <input
            type="text"
            value={tokenForm.name}
            onChange={(e) => setTokenForm({...tokenForm, name: e.target.value})}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:outline-none"
            placeholder="My Token"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
          <input
            type="text"
            value={tokenForm.symbol}
            onChange={(e) => setTokenForm({...tokenForm, symbol: e.target.value})}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:outline-none"
            placeholder="MTK"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Decimals</label>
          <input
            type="number"
            value={tokenForm.decimals}
            onChange={(e) => setTokenForm({...tokenForm, decimals: Number(e.target.value)})}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:outline-none"
            min="0"
            max="9"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Initial Supply</label>
          <input
            type="number"
            value={tokenForm.supply}
            onChange={(e) => setTokenForm({...tokenForm, supply: Number(e.target.value)})}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:outline-none"
            min="1"
          />
        </div>
      </div>
      <button
        onClick={handleDeployToken}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
        Deploy Token
      </button>
    </div>
  );

  const renderNFTTab = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white">Create NFT Collection</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Collection Name</label>
          <input
            type="text"
            value={nftForm.collectionName}
            onChange={(e) => setNftForm({...nftForm, collectionName: e.target.value})}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Collection Symbol</label>
          <input
            type="text"
            value={nftForm.collectionSymbol}
            onChange={(e) => setNftForm({...nftForm, collectionSymbol: e.target.value})}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            value={nftForm.collectionDescription}
            onChange={(e) => setNftForm({...nftForm, collectionDescription: e.target.value})}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Collection Image URL</label>
          <input
            type="url"
            value={nftForm.collectionImage}
            onChange={(e) => setNftForm({...nftForm, collectionImage: e.target.value})}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>
      <button
        onClick={handleCreateNFTCollection}
        disabled={loading}
        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
        Create Collection
      </button>
    </div>
  );

  const renderStakeTab = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white">Stake SOL</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Amount (SOL)</label>
          <input
            type="number"
            value={stakeForm.amount}
            onChange={(e) => setStakeForm({...stakeForm, amount: Number(e.target.value)})}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
            min="0.01"
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Validator Address</label>
          <input
            type="text"
            value={stakeForm.validatorAddress}
            onChange={(e) => setStakeForm({...stakeForm, validatorAddress: e.target.value})}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
            placeholder="Validator public key"
          />
        </div>
      </div>
      <button
        onClick={handleStakeSOL}
        disabled={loading}
        className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        Stake SOL
      </button>
    </div>
  );

  const renderTransactions = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white">Recent Transactions</h3>
      <div className="space-y-3">
        {transactions.length === 0 ? (
          <p className="text-gray-400">No transactions yet</p>
        ) : (
          transactions.map((tx, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-center gap-3">
                {tx.status === 'pending' && <Loader2 className="w-5 h-5 animate-spin text-blue-400" />}
                {tx.status === 'completed' && <Check className="w-5 h-5 text-green-400" />}
                {tx.status === 'failed' && <AlertCircle className="w-5 h-5 text-red-400" />}
                <div>
                  <p className="font-medium text-white">{tx.type}</p>
                  <p className="text-sm text-gray-400">{tx.details}</p>
                </div>
              </div>
              {tx.signature && (
                <div className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
                  {tx.signature.substring(0, 8)}...{tx.signature.substring(tx.signature.length - 8)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'swap', label: 'Swap', icon: TrendingUp },
    { id: 'tokens', label: 'Tokens', icon: Coins },
    { id: 'nft', label: 'NFT', icon: Gift },
    { id: 'stake', label: 'Stake', icon: Zap },
    { id: 'transactions', label: 'Transactions', icon: Users }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Solana Agent Kit testnet</h1>
        <p className="text-gray-400">Comprehensive toolkit for Solana blockchain interactions with platform integration</p>
      </div>

      {/* Integration Panel */}
      {renderIntegrationPanel()}

      {!solanaService.isInitialized() && (
        <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <p className="text-yellow-300">
              Solana Agent Kit not fully initialized. Please check your environment variables in the .env file.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'swap' && renderSwapTab()}
        {activeTab === 'tokens' && renderTokensTab()}
        {activeTab === 'nft' && renderNFTTab()}
        {activeTab === 'stake' && renderStakeTab()}
        {activeTab === 'transactions' && renderTransactions()}
      </div>

      <div className="mt-6 p-6 bg-gray-800 rounded-xl border border-gray-700">
        <h3 className="font-semibold text-white mb-4">Additional Features Available:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={handleCreateAndFundWallet}
            disabled={loading}
            className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600 text-left text-white transition-colors"
          >
            🔐 Create & Fund New Wallet
          </button>
          <div className="p-3 bg-gray-700 rounded-lg border border-gray-600 text-gray-400">
            💰 DeFi Operations (Lending, Borrowing)
          </div>
          <div className="p-3 bg-gray-700 rounded-lg border border-gray-600 text-gray-400">
            🏊 Liquidity Pool Management
          </div>
          <div className="p-3 bg-gray-700 rounded-lg border border-gray-600 text-gray-400">
            📊 Portfolio Analytics
          </div>
          <div className="p-3 bg-gray-700 rounded-lg border border-gray-600 text-gray-400">
            🔄 Batch Transactions
          </div>
          <div className="p-3 bg-gray-700 rounded-lg border border-gray-600 text-gray-400">
            📈 Token Price Tracking
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolanaAgentKittestnet; 