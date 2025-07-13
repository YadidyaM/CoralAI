// Node.js polyfills for browser environment
import { Buffer } from 'buffer';
import process from 'process';

// Type declarations for global scope
declare global {
  interface Window {
    Buffer: typeof Buffer;
    process: typeof process;
    global: typeof globalThis;
  }
  
  interface globalThis {
    Buffer: typeof Buffer;
    process: typeof process;
    global: typeof globalThis;
  }
}

// Make Buffer and process available globally
if (typeof globalThis !== 'undefined') {
  (globalThis as any).Buffer = Buffer;
  (globalThis as any).process = process;
  (globalThis as any).global = globalThis;
}

if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  (window as any).process = process;
  (window as any).global = globalThis;
}

export { Buffer, process }; 