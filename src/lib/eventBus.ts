import { EventEmitter } from "events";

export interface TelemetryEvent {
  topic: 
    | "LLM_CACHE" 
    | "VECTOR_RAG" 
    | "SWARM_ROUTING" 
    | "VM_SANDBOX" 
    | "SYSTEM_AUTH" 
    | "MEMORY_RECALL" 
    | "MEMORY_COMMIT";
  message: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

class EnterpriseEventBus extends EventEmitter {
  constructor() {
    super();
    // In a real environment, this limit would be much higher or disabled entirely
    this.setMaxListeners(50);
  }

  public publish(event: Omit<TelemetryEvent, "timestamp">) {
    const payload: TelemetryEvent = {
        ...event,
        timestamp: Date.now()
    };
    
    // Emit to internal listeners
    this.emit('telemetry', payload);
  }
}

// Global Singleton for enterprise telemetry
export const eventBus = new EnterpriseEventBus();
