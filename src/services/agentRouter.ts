import { openaiService } from './openaiService';

export interface AgentActivation {
  agentId: string;
  priority: 'primary' | 'secondary' | 'support';
  confidence: number;
  suggestedActions: string[];
  reasoning: string;
}

export interface PromptAnalysis {
  intent: string;
  category: 'nft' | 'defi' | 'wallet' | 'staking' | 'onboarding' | 'general';
  entities: string[];
  activations: AgentActivation[];
  requiresMultiAgent: boolean;
  urgency: 'low' | 'medium' | 'high';
}

class AgentRouter {
  private agentDefinitions = {
    'onboarding-guide': {
      specialties: ['user guidance', 'education', 'getting started', 'help', 'tutorial', 'beginner'],
      keywords: ['help', 'start', 'begin', 'learn', 'guide', 'tutorial', 'new', 'beginner', 'how'],
      capabilities: ['user onboarding', 'education', 'guidance']
    },
    'wallet-wizard': {
      specialties: ['wallet creation', 'security', 'keys', 'address', 'balance', 'private key'],
      keywords: ['wallet', 'key', 'address', 'security', 'balance', 'private', 'public', 'seed'],
      capabilities: ['wallet creation', 'security management', 'key handling']
    },
    'defi-scout': {
      specialties: ['yield farming', 'liquidity', 'trading', 'dex', 'swap', 'investment'],
      keywords: ['defi', 'yield', 'farm', 'trade', 'swap', 'liquidity', 'invest', 'dex', 'apy'],
      capabilities: ['yield optimization', 'trading', 'investment advice']
    },
    'nft-creator': {
      specialties: ['nft creation', 'art generation', 'mint', 'collection', 'metadata'],
      keywords: ['nft', 'art', 'create', 'generate', 'mint', 'collection', 'image', 'artwork'],
      capabilities: ['AI art generation', 'NFT minting', 'collection creation']
    },
    'staking-agent': {
      specialties: ['staking', 'validators', 'rewards', 'passive income', 'delegation'],
      keywords: ['stake', 'validator', 'rewards', 'passive', 'income', 'delegate', 'apy'],
      capabilities: ['staking optimization', 'validator selection', 'rewards tracking']
    }
  };

  async analyzePrompt(userInput: string, chatHistory: any[] = []): Promise<PromptAnalysis> {
    try {
      const contextualPrompt = this.buildAnalysisPrompt(userInput, chatHistory);
      const analysis = await openaiService.getChatResponse(contextualPrompt);
      
      // Parse AI response and convert to structured format
      const parsedAnalysis = this.parseAIAnalysis(analysis, userInput);
      
      // Enhance with rule-based matching
      const enhancedAnalysis = this.enhanceWithRules(parsedAnalysis, userInput);
      
      return enhancedAnalysis;
    } catch (error) {
      console.error('Error analyzing prompt:', error);
      // Fallback to rule-based analysis
      return this.fallbackAnalysis(userInput);
    }
  }

  private buildAnalysisPrompt(userInput: string, chatHistory: any[]): string {
    const agentInfo = Object.entries(this.agentDefinitions)
      .map(([id, def]) => `${id}: ${def.capabilities.join(', ')}`)
      .join('\n');

    const context = chatHistory.length > 0 
      ? `Recent conversation:\n${chatHistory.slice(-3).map(msg => `${msg.sender}: ${msg.content}`).join('\n')}\n\n`
      : '';

    return `You are an AI agent router. Analyze the user's input and determine which agents should be activated.

Available agents and their capabilities:
${agentInfo}

${context}User input: "${userInput}"

Respond with a JSON object containing:
{
  "intent": "brief description of user's intent",
  "category": "nft|defi|wallet|staking|onboarding|general",
  "entities": ["extracted entities"],
  "activations": [
    {
      "agentId": "agent-id",
      "priority": "primary|secondary|support",
      "confidence": 0.8,
      "suggestedActions": ["action1", "action2"],
      "reasoning": "why this agent should be activated"
    }
  ],
  "requiresMultiAgent": true/false,
  "urgency": "low|medium|high"
}

Examples:
- "Create an NFT of a dragon" → nft-creator (primary), wallet-wizard (support)
- "Best staking options?" → staking-agent (primary), defi-scout (secondary)
- "I'm new to crypto" → onboarding-guide (primary)
- "Swap SOL for USDC" → defi-scout (primary), wallet-wizard (support)

Return ONLY the JSON object.`;
  }

  private parseAIAnalysis(aiResponse: string, userInput: string): PromptAnalysis {
    try {
      // Extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and structure the response
      return {
        intent: parsed.intent || 'General assistance',
        category: parsed.category || 'general',
        entities: parsed.entities || [],
        activations: parsed.activations || [],
        requiresMultiAgent: parsed.requiresMultiAgent || false,
        urgency: parsed.urgency || 'medium'
      };
    } catch (error) {
      console.error('Error parsing AI analysis:', error);
      return this.fallbackAnalysis(userInput);
    }
  }

  private enhanceWithRules(analysis: PromptAnalysis, userInput: string): PromptAnalysis {
    const lowercaseInput = userInput.toLowerCase();
    
    // Rule-based enhancements
    const ruleActivations: AgentActivation[] = [];
    
    // Check each agent's keywords
    Object.entries(this.agentDefinitions).forEach(([agentId, definition]) => {
      const matchCount = definition.keywords.filter(keyword => 
        lowercaseInput.includes(keyword)
      ).length;
      
      if (matchCount > 0) {
        const confidence = Math.min(0.9, matchCount * 0.3);
        const existing = analysis.activations.find(a => a.agentId === agentId);
        
        if (!existing && confidence > 0.3) {
          ruleActivations.push({
            agentId,
            priority: confidence > 0.6 ? 'primary' : 'secondary',
            confidence,
            suggestedActions: [`Assist with ${analysis.category} task`],
            reasoning: `Keyword match detected for ${definition.specialties.join(', ')}`
          });
        }
      }
    });
    
    // Merge rule-based activations with AI analysis
    const combinedActivations = [
      ...analysis.activations,
      ...ruleActivations.filter(rule => 
        !analysis.activations.some(ai => ai.agentId === rule.agentId)
      )
    ];
    
    // Sort by confidence and priority
    combinedActivations.sort((a, b) => {
      const priorityWeight = { primary: 3, secondary: 2, support: 1 };
      return (priorityWeight[b.priority] * b.confidence) - (priorityWeight[a.priority] * a.confidence);
    });
    
    return {
      ...analysis,
      activations: combinedActivations.slice(0, 3) // Limit to top 3 agents
    };
  }

  private fallbackAnalysis(userInput: string): PromptAnalysis {
    const lowercaseInput = userInput.toLowerCase();
    const activations: AgentActivation[] = [];
    
    // Simple keyword matching fallback
    if (lowercaseInput.includes('nft') || lowercaseInput.includes('art') || lowercaseInput.includes('create')) {
      activations.push({
        agentId: 'nft-creator',
        priority: 'primary',
        confidence: 0.7,
        suggestedActions: ['Create NFT artwork', 'Generate metadata'],
        reasoning: 'NFT-related keywords detected'
      });
    }
    
    if (lowercaseInput.includes('stake') || lowercaseInput.includes('validator')) {
      activations.push({
        agentId: 'staking-agent',
        priority: 'primary',
        confidence: 0.7,
        suggestedActions: ['Find staking options', 'Calculate rewards'],
        reasoning: 'Staking-related keywords detected'
      });
    }
    
    if (lowercaseInput.includes('defi') || lowercaseInput.includes('swap') || lowercaseInput.includes('trade')) {
      activations.push({
        agentId: 'defi-scout',
        priority: 'primary',
        confidence: 0.7,
        suggestedActions: ['Find DeFi opportunities', 'Execute trades'],
        reasoning: 'DeFi-related keywords detected'
      });
    }
    
    if (lowercaseInput.includes('wallet') || lowercaseInput.includes('balance')) {
      activations.push({
        agentId: 'wallet-wizard',
        priority: 'primary',
        confidence: 0.7,
        suggestedActions: ['Manage wallet', 'Check security'],
        reasoning: 'Wallet-related keywords detected'
      });
    }
    
    if (lowercaseInput.includes('help') || lowercaseInput.includes('start') || lowercaseInput.includes('new')) {
      activations.push({
        agentId: 'onboarding-guide',
        priority: 'primary',
        confidence: 0.8,
        suggestedActions: ['Provide guidance', 'Explain concepts'],
        reasoning: 'Help/onboarding keywords detected'
      });
    }
    
    // Default to onboarding if no matches
    if (activations.length === 0) {
      activations.push({
        agentId: 'onboarding-guide',
        priority: 'primary',
        confidence: 0.5,
        suggestedActions: ['Provide general assistance'],
        reasoning: 'Default activation for general queries'
      });
    }
    
    return {
      intent: 'User assistance request',
      category: 'general',
      entities: [],
      activations,
      requiresMultiAgent: activations.length > 1,
      urgency: 'medium'
    };
  }

  async activateAgents(analysis: PromptAnalysis): Promise<void> {
    // This will be implemented when we integrate with the agent store
    console.log('Would activate agents:', analysis.activations.map(a => a.agentId));
  }

  // Helper method to get agent recommendations for UI
  getAgentRecommendations(analysis: PromptAnalysis): {
    primary: AgentActivation[];
    secondary: AgentActivation[];
    support: AgentActivation[];
  } {
    return {
      primary: analysis.activations.filter(a => a.priority === 'primary'),
      secondary: analysis.activations.filter(a => a.priority === 'secondary'),
      support: analysis.activations.filter(a => a.priority === 'support')
    };
  }
}

export const agentRouter = new AgentRouter(); 