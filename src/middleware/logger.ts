import type { Request, Response, NextFunction } from "express";

interface LogEntry {
  time: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  sessionId?: string;
  ip?: string;
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const sessionId =
    (req.body as Record<string, unknown>)?.sessionId as string | undefined;

  res.on("finish", () => {
    const entry: LogEntry = {
      time: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - start,
      ...(sessionId ? { sessionId } : {}),
      ip: req.ip ?? req.socket.remoteAddress
    };
    console.log(JSON.stringify(entry));
  });

  next();
}
