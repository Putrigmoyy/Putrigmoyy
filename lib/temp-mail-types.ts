export type TempMailSetupChecklist = {
  database: boolean;
  domains: boolean;
  inboundSecret: boolean;
  cronSecret: boolean;
};

export type TempMailProviderMode = 'local' | 'external';

export type TempMailExternalProviderSnapshot = {
  enabled: boolean;
  provider: string;
  baseUrl: string;
  defaultDomain: string;
};

export type TempMailConfigSnapshot = {
  primaryDomain: string;
  domains: string[];
  retentionHours: number;
  dashboardReady: boolean;
  coreReady: boolean;
  operationalReady: boolean;
  privateModeEnabled: boolean;
  providerMode: TempMailProviderMode;
  externalProvider: TempMailExternalProviderSnapshot;
  setupChecklist: TempMailSetupChecklist;
};

export type TempMailStoredAttachment = {
  filename: string | null;
  mimeType: string | null;
  disposition: 'attachment' | 'inline' | null;
  contentId: string | null;
  size: number | null;
};

export type TempMailInboxSummary = {
  id: string;
  localPart: string;
  domain: string;
  emailAddress: string;
  createdAt: string;
  messageCount: number;
  latestReceivedAt: string | null;
};

export type TempMailEmailSummary = {
  id: string;
  subject: string;
  fromName: string | null;
  fromAddress: string;
  toAddress: string;
  snippet: string;
  receivedAt: string;
  attachmentCount: number;
  hasHtml: boolean;
  hasText: boolean;
};

export type TempMailEmailDetail = TempMailEmailSummary & {
  messageId: string | null;
  htmlBody: string | null;
  textBody: string | null;
  headers: Record<string, string> | null;
  attachments: TempMailStoredAttachment[];
};

export type TempMailInboxDetailPayload = {
  inbox: TempMailInboxSummary;
  emails: TempMailEmailSummary[];
  selectedEmail: TempMailEmailDetail | null;
};

export type TempMailInboxListPayload = {
  config: TempMailConfigSnapshot;
  inboxes: TempMailInboxSummary[];
};
