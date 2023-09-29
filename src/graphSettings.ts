const settings: AppSettings = {
  clientId: process.env.AAD_CLIENT_ID,
  clientSecret: process.env.AAD_CLIENT_SECRET,
  tenantId: process.env.AAD_TENANT_ID,
  defaultSku: process.env.DEFAULT_SERVICE_PLAN
};

export interface AppSettings {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  defaultSku: string;
}

export default settings;
