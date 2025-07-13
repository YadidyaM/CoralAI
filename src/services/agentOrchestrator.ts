import { agentRouter, PromptAnalysis, AgentActivation } from './agentRouter';
import { useAgentStore } from '../stores/agentStore';
import { useSupabaseUserStore } from '../stores/supabaseUserStore';
import { openaiService } from './openaiService';
import { tatumService } from './tatumService';
import { supabaseService } from './supabaseService';
import { walletSyncService } from './walletSync';

export interface AgentTask {
  id: string;
  type: 'nft_creation' | 'defi_analysis' | 'wallet_setup' | 'staking_setup' | 'onboarding' | 'general';
  description: string;
  userPrompt: string;
  assignedAgents: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  createdAt: Date;
  completedAt?: Date;
}

export interface AgentAction {
  agentId: string;
  action: string;
  parameters: any;
  timestamp: Date;
}

class AgentOrchestrator {
  private currentTask: AgentTask | null = null;
  private activeAnalysis: PromptAnalysis | null = null;
  private taskHistory: AgentTask[] = [];

  async processUserPrompt(userPrompt: string, chatHistory: any[] = []): Promise<{
    analysis: PromptAnalysis;
    task: AgentTask;
    activatedAgents: string[];
  }> {
    try {
      // Analyze the prompt
      const analysis = await agentRouter.analyzePrompt(userPrompt, chatHistory);
      this.activeAnalysis = analysis;

      // Create a task based on the analysis
      const task = this.createTask(analysis, userPrompt);
      this.currentTask = task;

      // Activate relevant agents
      const activatedAgents = await this.activateAgents(analysis);

      // Execute automatic actions based on prompt type
      await this.executeAutomaticActions(analysis, userPrompt);

      return {
        analysis,
        task,
        activatedAgents
      };
    } catch (error) {
      console.error('Error processing user prompt:', error);
      throw error;
    }
  }

  private createTask(analysis: PromptAnalysis, userPrompt: string): AgentTask {
    const task: AgentTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      type: this.mapCategoryToTaskType(analysis.category),
      description: analysis.intent,
      userPrompt,
      assignedAgents: analysis.activations.map(a => a.agentId),
      status: 'pending',
      createdAt: new Date()
    };

    this.taskHistory.push(task);
    return task;
  }

  private mapCategoryToTaskType(category: PromptAnalysis['category']): AgentTask['type'] {
    switch (category) {
      case 'nft': return 'nft_creation';
      case 'defi': return 'defi_analysis';
      case 'wallet': return 'wallet_setup';
      case 'staking': return 'staking_setup';
      case 'onboarding': return 'onboarding';
      default: return 'general';
    }
  }

  private async activateAgents(analysis: PromptAnalysis): Promise<string[]> {
    const { setAgentStatus, addMessage } = useAgentStore.getState();
    const activatedAgents: string[] = [];

    // Activate agents based on priority
    for (const activation of analysis.activations) {
      setAgentStatus(activation.agentId, 'active');
      activatedAgents.push(activation.agentId);

      // Add activation message
      addMessage({
        agentId: activation.agentId,
        content: `Activated for: ${analysis.intent}`,
        type: 'task'
      });

      // Wait a bit between activations for visual effect
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return activatedAgents;
  }

  private async executeAutomaticActions(analysis: PromptAnalysis, userPrompt: string): Promise<void> {
    const { addMessage, setAgentStatus } = useAgentStore.getState();

    // Execute specific actions based on category and intent
    switch (analysis.category) {
      case 'nft':
        await this.handleNFTCreation(analysis, userPrompt);
        break;
      case 'defi':
        await this.handleDeFiAnalysis(analysis, userPrompt);
        break;
      case 'wallet':
        await this.handleWalletOperations(analysis, userPrompt);
        break;
      case 'staking':
        await this.handleStakingOperations(analysis, userPrompt);
        break;
      case 'onboarding':
        await this.handleOnboarding(analysis, userPrompt);
        break;
    }
  }

  private async handleNFTCreation(analysis: PromptAnalysis, userPrompt: string): Promise<void> {
    const { addMessage, setAgentStatus } = useAgentStore.getState();
    const { currentUser } = useSupabaseUserStore.getState();
    
    if (!currentUser) {
      addMessage({
        agentId: 'nft-creator',
        content: 'Please log in to create NFTs.',
        type: 'error'
      });
      return;
    }
    
    // Check if this looks like an NFT creation request
    const nftKeywords = ['create', 'generate', 'make', 'mint', 'art', 'image'];
    const hasCreationIntent = nftKeywords.some(keyword => 
      userPrompt.toLowerCase().includes(keyword)
    );

    if (hasCreationIntent) {
      setAgentStatus('nft-creator', 'processing');
      
      addMessage({
        agentId: 'nft-creator',
        content: 'Starting automatic NFT creation and minting process...',
        type: 'task'
      });

      try {
        // Get user's wallets using wallet sync service
        const userWallets = await walletSyncService.getUserWallets(currentUser.id);
        
        if (userWallets.length === 0) {
          addMessage({
            agentId: 'nft-creator',
            content: 'No wallets found. Please create a wallet first.',
            type: 'error'
          });
          setAgentStatus('nft-creator', 'error');
          return;
        }
        
        // Use primary wallet for the preferred network (Solana for NFTs) or first available
        const selectedWallet = await walletSyncService.getPrimaryWallet(currentUser.id, 'solana') || 
                              await walletSyncService.getPrimaryWallet(currentUser.id) || 
                              userWallets[0];
        
        // Extract art description from prompt
        const artDescription = await this.extractArtDescription(userPrompt);
        
        addMessage({
          agentId: 'nft-creator',
          content: `🎨 Generating artwork: "${artDescription}"...`,
          type: 'info'
        });
        
        // Generate NFT image
        const imageUrl = await openaiService.generateNFTImage(artDescription);
        
        // Generate metadata
        const metadata = await openaiService.generateNFTMetadata(artDescription);
        
        addMessage({
          agentId: 'nft-creator',
          content: `✅ Artwork generated! "${metadata.name}"\n🚀 Now minting with ${selectedWallet.name}...`,
          type: 'info'
        });

        // Mint NFT using Tatum
        const mintResult = await tatumService.mintNFT({
          name: metadata.name,
          description: metadata.description,
          image: imageUrl,
          attributes: metadata.attributes,
          walletPrivateKey: selectedWallet.private_key,
          recipientAddress: selectedWallet.address,
          network: selectedWallet.wallet_type
        });

        // Save NFT to database
        const savedNFT = await supabaseService.createUserNFT({
          user_id: currentUser.id,
          wallet_id: selectedWallet.id,
          name: metadata.name,
          description: metadata.description,
          image_url: imageUrl,
          mint_address: mintResult.mintAddress || mintResult.tokenId || mintResult.txId,
          token_id: mintResult.tokenId,
          network: selectedWallet.network,
          attributes: metadata.attributes,
          metadata: metadata,
          transaction_hash: mintResult.txId
        });
        
        addMessage({
          agentId: 'nft-creator',
          content: `🎉 NFT "${metadata.name}" minted successfully!\n📍 Transaction: ${mintResult.txId.slice(0, 8)}...\n💾 Saved to your collection`,
          type: 'completion'
        });

        // Update task with result
        if (this.currentTask) {
          this.currentTask.result = { 
            imageUrl, 
            metadata, 
            artDescription,
            mintResult,
            savedNFT,
            wallet: selectedWallet,
            minted: true,
            persistent: true
          };
          this.currentTask.status = 'completed';
          this.currentTask.completedAt = new Date();
        }

        setAgentStatus('nft-creator', 'idle');
      } catch (error) {
        console.error('Error creating NFT via agent:', error);
        addMessage({
          agentId: 'nft-creator',
          content: 'Failed to create and mint NFT. Please try again.',
          type: 'error'
        });
        setAgentStatus('nft-creator', 'error');
      }
    }
  }

  private async handleDeFiAnalysis(analysis: PromptAnalysis, userPrompt: string): Promise<void> {
    const { addMessage, setAgentStatus } = useAgentStore.getState();
    
    // Check for investment amount in prompt
    const amountMatch = userPrompt.match(/(\d+(?:\.\d+)?)\s*(sol|SOL)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 50;

    setAgentStatus('defi-scout', 'processing');
    
    addMessage({
      agentId: 'defi-scout',
      content: `Analyzing DeFi opportunities for ${amount} SOL...`,
      type: 'task'
    });

    try {
      // Get AI investment advice
      const advice = await openaiService.getInvestmentAdvice(amount, 'medium');
      
      addMessage({
        agentId: 'defi-scout',
        content: `Found optimal DeFi strategy: ${advice.substring(0, 100)}...`,
        type: 'completion'
      });

      // Update task with result
      if (this.currentTask) {
        this.currentTask.result = { advice, amount };
        this.currentTask.status = 'completed';
        this.currentTask.completedAt = new Date();
      }

      setAgentStatus('defi-scout', 'idle');
    } catch (error) {
      addMessage({
        agentId: 'defi-scout',
        content: 'Failed to analyze DeFi opportunities.',
        type: 'error'
      });
      setAgentStatus('defi-scout', 'error');
    }
  }

  private async handleWalletOperations(analysis: PromptAnalysis, userPrompt: string): Promise<void> {
    const { addMessage, setAgentStatus } = useAgentStore.getState();
    const { currentUser } = useSupabaseUserStore.getState();
    
    if (!currentUser) {
      addMessage({
        agentId: 'wallet-wizard',
        content: 'Please log in to create wallets.',
        type: 'error'
      });
      return;
    }
    
    if (userPrompt.toLowerCase().includes('create') || userPrompt.toLowerCase().includes('new')) {
      setAgentStatus('wallet-wizard', 'processing');
      
      // Determine wallet type from prompt
      const walletType = userPrompt.toLowerCase().includes('ethereum') ? 'ethereum' : 'solana';
      
      addMessage({
        agentId: 'wallet-wizard',
        content: `Creating new ${walletType} wallet with Tatum...`,
        type: 'task'
      });

      try {
        // Use wallet sync service for consistent wallet creation
        const savedWallet = await walletSyncService.createWallet(currentUser.id, walletType);
        
        addMessage({
          agentId: 'wallet-wizard',
          content: `✅ ${walletType} wallet created and saved to your account!\n📍 Address: ${savedWallet.address.slice(0, 8)}...${savedWallet.address.slice(-8)}\n💾 Name: ${savedWallet.name}`,
          type: 'completion'
        });

        if (this.currentTask) {
          this.currentTask.result = { 
            wallet: { address: savedWallet.address, privateKey: savedWallet.private_key },
            savedWallet: savedWallet,
            persistent: true 
          };
          this.currentTask.status = 'completed';
          this.currentTask.completedAt = new Date();
        }

        setAgentStatus('wallet-wizard', 'idle');
      } catch (error) {
        console.error('Error creating wallet via agent:', error);
        addMessage({
          agentId: 'wallet-wizard',
          content: 'Failed to create wallet. Please try again.',
          type: 'error'
        });
        setAgentStatus('wallet-wizard', 'error');
      }
    }
  }

  private async handleStakingOperations(analysis: PromptAnalysis, userPrompt: string): Promise<void> {
    const { addMessage, setAgentStatus } = useAgentStore.getState();
    
    setAgentStatus('staking-agent', 'processing');
    
    addMessage({
      agentId: 'staking-agent',
      content: 'Analyzing staking opportunities...',
      type: 'task'
    });

    // Simulate staking analysis
    setTimeout(() => {
      addMessage({
        agentId: 'staking-agent',
        content: 'Found optimal validators with 6.8% APY. Ready to stake!',
        type: 'completion'
      });

      if (this.currentTask) {
        this.currentTask.result = { 
          validators: ['J1to3PQfXidUUhprQWgdKkQAMWPJAEqSJ7amkBDE9qhF'],
          apy: 6.8 
        };
        this.currentTask.status = 'completed';
        this.currentTask.completedAt = new Date();
      }

      setAgentStatus('staking-agent', 'idle');
    }, 2000);
  }

  private async handleOnboarding(analysis: PromptAnalysis, userPrompt: string): Promise<void> {
    const { addMessage, setAgentStatus } = useAgentStore.getState();
    
    setAgentStatus('onboarding-guide', 'processing');
    
    addMessage({
      agentId: 'onboarding-guide',
      content: 'Preparing personalized onboarding guidance...',
      type: 'task'
    });

    // Simulate onboarding preparation
    setTimeout(() => {
      addMessage({
        agentId: 'onboarding-guide',
        content: 'Onboarding plan ready! Let\'s start your Solana journey.',
        type: 'completion'
      });

      setAgentStatus('onboarding-guide', 'idle');
    }, 1500);
  }

  private async extractArtDescription(userPrompt: string): Promise<string> {
    try {
      const response = await openaiService.getChatResponse(
        `Extract and enhance the art description from this user prompt for NFT creation: "${userPrompt}". 
         Return only the enhanced art description, no other text.`
      );
      return response || userPrompt;
    } catch (error) {
      // Fallback to original prompt
      return userPrompt;
    }
  }

  async coordinateAgents(agentIds: string[], task: string): Promise<void> {
    const { addMessage, setAgentStatus } = useAgentStore.getState();
    
    addMessage({
      agentId: 'system',
      content: `Coordinating ${agentIds.length} agents for: ${task}`,
      type: 'info'
    });

    for (const agentId of agentIds) {
      setAgentStatus(agentId, 'processing');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  getCurrentAnalysis(): PromptAnalysis | null {
    return this.activeAnalysis;
  }

  getCurrentTask(): AgentTask | null {
    return this.currentTask;
  }

  getTaskHistory(): AgentTask[] {
    return this.taskHistory;
  }

  async completeTask(taskId: string, result: any): Promise<void> {
    const task = this.taskHistory.find(t => t.id === taskId);
    if (task) {
      task.status = 'completed';
      task.result = result;
      task.completedAt = new Date();
      
      const { addMessage } = useAgentStore.getState();
      addMessage({
        agentId: 'system',
        content: `Task completed: ${task.description}`,
        type: 'completion'
      });
    }
  }

  async failTask(taskId: string, error: string): Promise<void> {
    const task = this.taskHistory.find(t => t.id === taskId);
    if (task) {
      task.status = 'failed';
      task.result = { error };
      task.completedAt = new Date();
      
      const { addMessage } = useAgentStore.getState();
      addMessage({
        agentId: 'system',
        content: `Task failed: ${task.description} - ${error}`,
        type: 'error'
      });
    }
  }
}

export const agentOrchestrator = new AgentOrchestrator(); 