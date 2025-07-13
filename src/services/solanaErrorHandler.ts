export interface SolanaError {
  code: string;
  message: string;
  type: 'network' | 'wallet' | 'transaction' | 'api' | 'unknown';
  details?: any;
  timestamp: number;
}

export class SolanaErrorHandler {
  private static errorLog: SolanaError[] = [];
  private static maxLogSize = 100;

  static handleError(error: any, context: string = 'unknown'): SolanaError {
    const solanaError: SolanaError = {
      code: this.getErrorCode(error),
      message: this.getErrorMessage(error),
      type: this.getErrorType(error),
      details: error,
      timestamp: Date.now()
    };

    this.logError(solanaError, context);
    return solanaError;
  }

  private static getErrorCode(error: any): string {
    if (error?.code) return error.code;
    if (error?.message?.includes('insufficient funds')) return 'INSUFFICIENT_FUNDS';
    if (error?.message?.includes('blockhash not found')) return 'BLOCKHASH_NOT_FOUND';
    if (error?.message?.includes('Transaction simulation failed')) return 'SIMULATION_FAILED';
    if (error?.message?.includes('RPC')) return 'RPC_ERROR';
    if (error?.message?.includes('timeout')) return 'TIMEOUT';
    if (error?.message?.includes('Network request failed')) return 'NETWORK_ERROR';
    if (error?.message?.includes('Invalid public key')) return 'INVALID_PUBLIC_KEY';
    if (error?.message?.includes('signature verification failed')) return 'SIGNATURE_FAILED';
    return 'UNKNOWN_ERROR';
  }

  private static getErrorMessage(error: any): string {
    if (error?.message) return error.message;
    if (typeof error === 'string') return error;
    return 'An unknown error occurred';
  }

  private static getErrorType(error: any): SolanaError['type'] {
    const code = this.getErrorCode(error);
    
    if (['INSUFFICIENT_FUNDS', 'INVALID_PUBLIC_KEY', 'SIGNATURE_FAILED'].includes(code)) {
      return 'wallet';
    }
    
    if (['BLOCKHASH_NOT_FOUND', 'SIMULATION_FAILED'].includes(code)) {
      return 'transaction';
    }
    
    if (['RPC_ERROR', 'NETWORK_ERROR', 'TIMEOUT'].includes(code)) {
      return 'network';
    }
    
    if (error?.message?.includes('API')) {
      return 'api';
    }
    
    return 'unknown';
  }

  private static logError(error: SolanaError, context: string) {
    console.error(`[${context}] Solana Error:`, error);
    
    this.errorLog.unshift({ ...error, details: { ...error.details, context } });
    
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }
  }

  static getErrorLog(): SolanaError[] {
    return [...this.errorLog];
  }

  static clearErrorLog() {
    this.errorLog = [];
  }

  static getErrorsByType(type: SolanaError['type']): SolanaError[] {
    return this.errorLog.filter(error => error.type === type);
  }

  static getRecentErrors(minutes: number = 5): SolanaError[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.errorLog.filter(error => error.timestamp > cutoff);
  }

  static isRetryableError(error: SolanaError): boolean {
    const retryableCodes = [
      'TIMEOUT',
      'NETWORK_ERROR',
      'RPC_ERROR',
      'BLOCKHASH_NOT_FOUND'
    ];
    
    return retryableCodes.includes(error.code);
  }

  static getUserFriendlyMessage(error: SolanaError): string {
    const messages: Record<string, string> = {
      'INSUFFICIENT_FUNDS': 'You don\'t have enough SOL to complete this transaction. Please add more funds to your wallet.',
      'BLOCKHASH_NOT_FOUND': 'Transaction expired. Please try again.',
      'SIMULATION_FAILED': 'Transaction simulation failed. Please check your inputs and try again.',
      'RPC_ERROR': 'Network connection issue. Please check your internet connection and try again.',
      'TIMEOUT': 'Request timed out. Please try again.',
      'NETWORK_ERROR': 'Network error. Please check your connection and try again.',
      'INVALID_PUBLIC_KEY': 'Invalid wallet address. Please check the address and try again.',
      'SIGNATURE_FAILED': 'Transaction signature verification failed. Please try again.'
    };

    return messages[error.code] || 'An unexpected error occurred. Please try again.';
  }
}

// Enhanced retry mechanism
export class RetryManager {
  private static retryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  };

  static async withRetry<T>(
    operation: () => Promise<T>,
    context: string = 'unknown',
    customConfig?: Partial<typeof RetryManager.retryConfig>
  ): Promise<T> {
    const config = { ...this.retryConfig, ...customConfig };
    let lastError: any;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const solanaError = SolanaErrorHandler.handleError(error, context);
        
        if (attempt === config.maxRetries || !SolanaErrorHandler.isRetryableError(solanaError)) {
          throw error;
        }

        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );

        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

// Network health checker
export class NetworkHealthChecker {
  private static lastHealthCheck = 0;
  private static healthCheckInterval = 30000; // 30 seconds
  private static isHealthy = true;

  static async checkHealth(rpcUrl: string): Promise<boolean> {
    const now = Date.now();
    
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.isHealthy;
    }

    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth'
        })
      });

      if (!response.ok) {
        this.isHealthy = false;
        return false;
      }

      const data = await response.json();
      this.isHealthy = data.result === 'ok';
      this.lastHealthCheck = now;
      
      return this.isHealthy;
    } catch (error) {
      console.error('Health check failed:', error);
      this.isHealthy = false;
      return false;
    }
  }

  static getHealthStatus(): boolean {
    return this.isHealthy;
  }
}

// Security utilities
export class SecurityUtils {
  static validatePublicKey(publicKey: string): boolean {
    try {
      // Basic validation for Solana public key format
      if (!publicKey || typeof publicKey !== 'string') return false;
      if (publicKey.length < 32 || publicKey.length > 44) return false;
      
      // Check for valid base58 characters
      const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
      return base58Regex.test(publicKey);
    } catch {
      return false;
    }
  }

  static validateTokenMint(mintAddress: string): boolean {
    return this.validatePublicKey(mintAddress);
  }

  static validateAmount(amount: number): boolean {
    return typeof amount === 'number' && amount > 0 && isFinite(amount);
  }

  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    
    // Remove potentially harmful characters
    return input
      .replace(/[<>\"']/g, '')
      .trim()
      .substring(0, 1000); // Limit length
  }

  static isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  }

  static rateLimit = (() => {
    const calls: Record<string, number[]> = {};
    const limits: Record<string, { maxCalls: number; window: number }> = {
      'token-deploy': { maxCalls: 5, window: 60000 }, // 5 per minute
      'nft-mint': { maxCalls: 10, window: 60000 }, // 10 per minute
      'swap': { maxCalls: 20, window: 60000 }, // 20 per minute
      'stake': { maxCalls: 5, window: 60000 } // 5 per minute
    };

    return (action: string): boolean => {
      const now = Date.now();
      const limit = limits[action];
      
      if (!limit) return true; // No limit for this action
      
      if (!calls[action]) calls[action] = [];
      
      // Remove old calls outside the window
      calls[action] = calls[action].filter(time => now - time < limit.window);
      
      if (calls[action].length >= limit.maxCalls) {
        return false; // Rate limited
      }
      
      calls[action].push(now);
      return true;
    };
  })();
}

// Usage example:
/*
try {
  const result = await RetryManager.withRetry(
    () => solanaService.swapTokens(inputMint, outputMint, amount),
    'token-swap'
  );
  
  // Success handling
} catch (error) {
  const solanaError = SolanaErrorHandler.handleError(error, 'token-swap');
  const userMessage = SolanaErrorHandler.getUserFriendlyMessage(solanaError);
  
  // Show user-friendly error message
  alert(userMessage);
}
*/ 