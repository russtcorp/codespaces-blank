import { Toucan } from "toucan-js";

export interface LogContext {
  tenantId?: string;
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
}

export class Logger {
  private sentry: Toucan | null = null;
  private context: LogContext = {};

  constructor(request: Request, env: any, ctx?: ExecutionContext) {
    // Initialize Sentry (Toucan)
    if (env.SENTRY_DSN && ctx) {
      this.sentry = new Toucan({
        dsn: env.SENTRY_DSN,
        context: ctx,
        request,
        allowedHeaders: ["user-agent", "cf-ray"],
        allowedSearchParams: /(.*)/,
        release: env.RELEASE || "1.0.0",
        environment: env.ENVIRONMENT || "development",
      });
      
      // Attach initial context if available in request (e.g. from middleware)
      const requestId = request.headers.get("cf-ray") || crypto.randomUUID();
      this.setContext({ requestId });
    }
  }

  setContext(context: LogContext) {
    this.context = { ...this.context, ...context };
    if (this.sentry) {
      if (context.userId) this.sentry.setUser({ id: context.userId });
      if (context.tenantId) this.sentry.setTag("tenant_id", context.tenantId);
      this.sentry.setExtra("context", this.context);
    }
  }

  private log(level: LogLevel, message: string, extra?: any) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.context, ...extra },
    };

    // 1. Structured JSON logging to stdout (for Cloudflare Logs)
    console.log(JSON.stringify(entry));

    // 2. Sentry Reporting
    if (this.sentry) {
      this.sentry.addBreadcrumb({
        message,
        category: "log",
        level: level as any,
        data: extra,
      });

      if (level === "error") {
        this.sentry.captureMessage(message, "error");
      }
    }
  }

  debug(message: string, extra?: any) {
    this.log("debug", message, extra);
  }

  info(message: string, extra?: any) {
    this.log("info", message, extra);
  }

  warn(message: string, extra?: any) {
    this.log("warn", message, extra);
  }

  error(message: string | Error, extra?: any) {
    if (message instanceof Error) {
      // 1. JSON Log
      console.error(JSON.stringify({
        level: "error",
        message: message.message,
        stack: message.stack,
        timestamp: new Date().toISOString(),
        context: { ...this.context, ...extra },
      }));

      // 2. Sentry Capture
      if (this.sentry) {
        this.sentry.captureException(message);
      }
    } else {
      this.log("error", message, extra);
    }
  }

  // Allow direct access to Toucan instance for advanced usage
  getSentry() {
    return this.sentry;
  }
}
