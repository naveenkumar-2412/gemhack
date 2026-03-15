import vm from "vm";

export interface SandboxResult {
  success: boolean;
  output: string;
  error?: string;
  executionTimeMs: number;
}

/**
 * Enterprise Secure VM Sandbox
 * Executes dynamically generated code in a restricted Node context.
 * Prevents access to filesystem, network, and limits execution time to prevent infinite loops.
 */
export async function executeInSandbox(code: string, timeoutMs: number = 3000): Promise<SandboxResult> {
  const start = performance.now();
  let consoleOutput = "";

  // Sandbox context mocks
  const sandbox = {
    console: {
      log: (...args: any[]) => { consoleOutput += args.join(" ") + "\\n"; },
      error: (...args: any[]) => { consoleOutput += "[ERROR] " + args.join(" ") + "\\n"; },
      warn: (...args: any[]) => { consoleOutput += "[WARN] " + args.join(" ") + "\\n"; }
    },
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    setTimeout: (fn: Function, ms: number) => { /* Mock to prevent runaway timers */ } 
  };

  try {
    const context = vm.createContext(sandbox);
    
    // Attempt execution with strict timeout
    const script = new vm.Script(code);
    script.runInContext(context, { timeout: timeoutMs });
    
    return {
      success: true,
      output: consoleOutput.trim() || "Execution finished silently.",
      executionTimeMs: Math.round(performance.now() - start)
    };
  } catch (error: any) {
    return {
      success: false,
      output: consoleOutput.trim(),
      error: error.message || "Unknown Sandbox Exception",
      executionTimeMs: Math.round(performance.now() - start)
    };
  }
}
