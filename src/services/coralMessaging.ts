import { useAgentStore } from '../stores/agentStore';

export interface CoralMessage {
  from: string;
  to: string;
  type: 'task_request' | 'task_completion' | 'data_share' | 'coordination';
  payload: any;
  timestamp: Date;
}

class CoralMessagingService {
  private messageQueue: CoralMessage[] = [];
  private subscribers: Map<string, Function[]> = new Map();

  send(message: Omit<CoralMessage, 'timestamp'>): void {
    const fullMessage: CoralMessage = {
      ...message,
      timestamp: new Date()
    };

    this.messageQueue.push(fullMessage);
    this.processMessage(fullMessage);
  }

  subscribe(agentId: string, handler: (message: CoralMessage) => void): void {
    if (!this.subscribers.has(agentId)) {
      this.subscribers.set(agentId, []);
    }
    this.subscribers.get(agentId)!.push(handler);
  }

  private processMessage(message: CoralMessage): void {
    const handlers = this.subscribers.get(message.to);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }

    // Add to agent store for UI display
    useAgentStore.getState().addMessage({
      agentId: message.from,
      content: `→ ${message.to}: ${this.formatMessageContent(message)}`,
      type: 'info',
      data: message.payload
    });
  }

  private formatMessageContent(message: CoralMessage): string {
    switch (message.type) {
      case 'task_request':
        return `Requesting ${message.payload.taskType}`;
      case 'task_completion':
        return `Completed ${message.payload.taskType}`;
      case 'data_share':
        return `Sharing ${message.payload.dataType}`;
      case 'coordination':
        return `Coordinating ${message.payload.action}`;
      default:
        return 'Unknown message type';
    }
  }

  // Predefined coordination flows
  initiateOnboardingFlow(): void {
    this.send({
      from: 'onboarding-guide',
      to: 'wallet-wizard',
      type: 'task_request',
      payload: { taskType: 'create_wallet', priority: 'high' }
    });
  }

  initiateDefiFlow(amount: number): void {
    this.send({
      from: 'wallet-wizard',
      to: 'defi-scout',
      type: 'task_request',
      payload: { taskType: 'find_yield_opportunities', amount }
    });
  }

  initiateNftFlow(prompt: string): void {
    this.send({
      from: 'user-interface',
      to: 'nft-creator',
      type: 'task_request',
      payload: { taskType: 'create_nft', prompt }
    });
  }

  initiateStakingFlow(amount: number): void {
    this.send({
      from: 'defi-scout',
      to: 'staking-agent',
      type: 'task_request',
      payload: { taskType: 'stake_tokens', amount }
    });
  }
}

export const coralMessaging = new CoralMessagingService();