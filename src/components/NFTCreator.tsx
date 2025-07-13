import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Palette, Image, Sparkles, Upload, Wallet, ExternalLink, Star } from 'lucide-react';
import { openaiService } from '../services/openaiService';
import { tatumService } from '../services/tatumService';
import { useSupabaseUserStore } from '../stores/supabaseUserStore';
import { useAgentStore } from '../stores/agentStore';
import { supabaseService } from '../services/supabaseService';
import { walletSyncService } from '../services/walletSync';

interface UserWallet {
  id: string;
  address: string;
  private_key: string;
  wallet_type: 'solana' | 'ethereum';
  name: string;
  is_primary: boolean;
  balance: number;
  network: string;
}

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{ trait_type: string; value: string }>;
}

export const NFTCreator: React.FC = () => {
  const { currentUser } = useSupabaseUserStore();
  const { addMessage, setAgentStatus } = useAgentStore();
  
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [mintLoading, setMintLoading] = useState(false);
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<UserWallet | null>(null);
  const [networkFilter, setNetworkFilter] = useState<'all' | 'solana' | 'ethereum'>('all');
  const [userNFTs, setUserNFTs] = useState<any[]>([]);
  const [showNFTs, setShowNFTs] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadUserWallets();
      loadUserNFTs();
    }
  }, [currentUser]);

  const loadUserWallets = async () => {
    if (!currentUser) return;
    
    try {
      const userWallets = await walletSyncService.getUserWallets(currentUser.id);
      setWallets(userWallets);
      
      // Select primary wallet or first wallet
      const primaryWallet = await walletSyncService.getPrimaryWallet(currentUser.id, 'solana') || 
                            await walletSyncService.getPrimaryWallet(currentUser.id) ||
                            userWallets[0];
      setSelectedWallet(primaryWallet || null);
    } catch (error) {
      console.error('Error loading wallets:', error);
    }
  };

  const loadUserNFTs = async () => {
    if (!currentUser) return;
    
    try {
      const nfts = await supabaseService.getUserNFTs(currentUser.id);
      setUserNFTs(nfts);
    } catch (error) {
      console.error('Error loading NFTs:', error);
    }
  };

  const generateNFT = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setAgentStatus('nft-creator', 'processing');
    
    addMessage({
      agentId: 'nft-creator',
      content: `Creating NFT with AI: "${prompt}"`,
      type: 'task'
    });

    try {
      // Generate image using OpenAI
      const imageUrl = await openaiService.generateNFTImage(prompt);
      setGeneratedImage(imageUrl);
      
      // Generate metadata using OpenAI
      const nftMetadata = await openaiService.generateNFTMetadata(prompt);
      setMetadata({
        name: nftMetadata.name,
        description: nftMetadata.description,
        image: imageUrl,
        attributes: nftMetadata.attributes
      });
      
      addMessage({
        agentId: 'nft-creator',
        content: 'NFT artwork and metadata generated successfully!',
        type: 'completion'
      });

      setAgentStatus('nft-creator', 'idle');
    } catch (error) {
      console.error('Error generating NFT:', error);
      addMessage({
        agentId: 'nft-creator',
        content: 'Failed to generate NFT artwork',
        type: 'error'
      });
      setAgentStatus('nft-creator', 'error');
    } finally {
      setLoading(false);
    }
  };

  const mintNFT = async () => {
    if (!generatedImage || !metadata || !selectedWallet) return;

    setMintLoading(true);
    setAgentStatus('nft-creator', 'processing');
    
    addMessage({
      agentId: 'nft-creator',
      content: `Minting NFT "${metadata.name}" on ${selectedWallet.wallet_type} using Tatum...`,
      type: 'task'
    });

    try {
      // Mint NFT using Tatum
      const result = await tatumService.mintNFT({
        name: metadata.name,
        description: metadata.description,
        image: metadata.image,
        attributes: metadata.attributes,
        walletPrivateKey: selectedWallet.private_key,
        recipientAddress: selectedWallet.address,
        network: selectedWallet.wallet_type
      });

      // Save NFT to database
      await supabaseService.createUserNFT({
        user_id: currentUser!.id,
        wallet_id: selectedWallet.id,
        name: metadata.name,
        description: metadata.description,
        image_url: metadata.image,
        mint_address: result.mintAddress || result.tokenId || result.txId,
        token_id: result.tokenId,
        network: selectedWallet.network,
        attributes: metadata.attributes,
        metadata: metadata,
        transaction_hash: result.txId
      });

      addMessage({
        agentId: 'nft-creator',
        content: `NFT minted successfully! Transaction: ${result.txId.slice(0, 8)}...`,
        type: 'completion'
      });

      // Reset form and reload NFTs
      setPrompt('');
      setGeneratedImage('');
      setMetadata(null);
      await loadUserNFTs();
      
      setAgentStatus('nft-creator', 'idle');
    } catch (error) {
      console.error('Error minting NFT:', error);
      addMessage({
        agentId: 'nft-creator',
        content: 'Failed to mint NFT',
        type: 'error'
      });
      setAgentStatus('nft-creator', 'error');
    } finally {
      setMintLoading(false);
    }
  };

  const toggleNFTFavorite = async (nftId: string, currentStatus: boolean) => {
    try {
      await supabaseService.updateUserNFT(nftId, {
        is_favorited: !currentStatus
      });
      await loadUserNFTs();
    } catch (error) {
      console.error('Error updating NFT favorite:', error);
    }
  };

  const getExplorerUrl = (nft: any) => {
    if (nft.network.includes('solana')) {
      return `https://explorer.solana.com/address/${nft.mint_address}${nft.network.includes('devnet') ? '?cluster=devnet' : ''}`;
    } else if (nft.network.includes('ethereum')) {
      return `https://etherscan.io/nft/${nft.collection_address}/${nft.token_id}`;
    }
    return '';
  };

  const filteredNFTs = userNFTs.filter(nft => {
    if (networkFilter === 'all') return true;
    return nft.user_wallets.wallet_type === networkFilter;
  });

  if (!currentUser) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <p className="text-gray-400">Please log in to create NFTs</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-xl p-6 border border-gray-700"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Palette className="w-6 h-6 text-pink-400" />
          <h2 className="text-xl font-semibold text-white">Tatum NFT Creator</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowNFTs(!showNFTs)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              showNFTs 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            My NFTs ({userNFTs.length})
          </button>
        </div>
      </div>

      {showNFTs ? (
        <div className="space-y-4">
          {/* NFT Collection Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">My NFT Collection</h3>
            <select
              value={networkFilter}
              onChange={(e) => setNetworkFilter(e.target.value as 'all' | 'solana' | 'ethereum')}
              className="bg-gray-700 text-white px-3 py-1 rounded-lg border border-gray-600 text-sm"
            >
              <option value="all">All Networks</option>
              <option value="solana">Solana</option>
              <option value="ethereum">Ethereum</option>
            </select>
          </div>

          {/* NFT Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNFTs.map((nft) => (
              <motion.div
                key={nft.id}
                whileHover={{ scale: 1.02 }}
                className="bg-gray-900 rounded-lg p-4 border border-gray-700"
              >
                <div className="relative mb-3">
                  <img
                    src={nft.image_url}
                    alt={nft.name}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => toggleNFTFavorite(nft.id, nft.is_favorited)}
                    className="absolute top-2 right-2 p-1 bg-gray-800/80 rounded-full hover:bg-gray-700/80 transition-colors"
                  >
                    <Star className={`w-4 h-4 ${nft.is_favorited ? 'text-yellow-400 fill-current' : 'text-gray-400'}`} />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-medium truncate">{nft.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      nft.user_wallets.wallet_type === 'solana' 
                        ? 'bg-purple-600/20 text-purple-300' 
                        : 'bg-blue-600/20 text-blue-300'
                    }`}>
                      {nft.user_wallets.wallet_type}
                    </span>
                  </div>
                  
                  <p className="text-gray-400 text-sm line-clamp-2">{nft.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">
                      {nft.user_wallets.name}
                    </span>
                    <a
                      href={getExplorerUrl(nft)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  
                  {nft.attributes && nft.attributes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {nft.attributes.slice(0, 3).map((attr: any, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded-full"
                        >
                          {attr.trait_type}: {attr.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {filteredNFTs.length === 0 && (
            <div className="text-center py-8">
              <Palette className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No NFTs found</p>
              <p className="text-gray-500 text-sm">Create your first NFT to get started</p>
            </div>
          )}

          <button
            onClick={() => setShowNFTs(false)}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Create New NFT
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Wallet Selection */}
          {wallets.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Wallet for Minting
              </label>
              <div className="flex space-x-2">
                {wallets.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => setSelectedWallet(wallet)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                      selectedWallet?.id === wallet.id
                        ? 'border-purple-500 bg-purple-600/10 text-purple-300'
                        : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                    <span className="text-sm">{wallet.name}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      wallet.wallet_type === 'solana' 
                        ? 'bg-purple-600/20 text-purple-300' 
                        : 'bg-blue-600/20 text-blue-300'
                    }`}>
                      {wallet.wallet_type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Describe your NFT
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A futuristic cyberpunk cat with glowing neon eyes in a digital city"
                className="w-full h-24 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
              <Sparkles className="absolute top-3 right-3 w-5 h-5 text-purple-400" />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={generateNFT}
            disabled={loading || !prompt.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <Image className="w-4 h-4" />
            <span>{loading ? 'Generating...' : 'Generate NFT with AI'}</span>
          </motion.button>

          {/* Generated NFT Preview */}
          {generatedImage && metadata && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-4">Generated NFT Preview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <img
                    src={generatedImage}
                    alt="Generated NFT"
                    className="w-full rounded-lg border border-gray-700"
                  />
                  <div className="space-y-3">
                    <div>
                      <p className="text-gray-400 text-sm">Name</p>
                      <p className="text-white font-medium">{metadata.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Description</p>
                      <p className="text-gray-300 text-sm">{metadata.description}</p>
                    </div>
                    {metadata.attributes && metadata.attributes.length > 0 && (
                      <div>
                        <p className="text-gray-400 text-sm">Attributes</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {metadata.attributes.map((attr, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded-full"
                            >
                              {attr.trait_type}: {attr.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={mintNFT}
                disabled={mintLoading || !selectedWallet}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>
                  {mintLoading 
                    ? 'Minting...' 
                    : `Mint NFT on ${selectedWallet?.wallet_type || 'Blockchain'}`
                  }
                </span>
              </motion.button>

              {!selectedWallet && (
                <p className="text-yellow-400 text-sm text-center">
                  Please select a wallet to mint your NFT
                </p>
              )}
            </motion.div>
          )}

          {wallets.length === 0 && (
            <div className="text-center py-8">
              <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No wallets found</p>
              <p className="text-gray-500 text-sm">Create a wallet first to mint NFTs</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};