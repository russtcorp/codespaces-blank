export interface InboundMessage {
  id?: string;
  from: string;
  to?: string;
  tenantId?: string;
  body?: string;
  channel?: "sms" | "voice" | "chat";
}

export interface ChatMessage {
  id: string;
  from: string;
  body: string;
  timestamp: string;
  channel: "sms" | "voice" | "chat";
}

export interface AgentCommand {
  type: "STATUS" | "OUT_OF_STOCK" | "OPEN_LATE" | "UNKNOWN";
  item?: string;
  until?: string;
}
