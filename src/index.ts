interface IQlikSaaSConfig {
  webIntegrationId: string;
  tenantDomain: string;
}

interface IQlikSaaSHeaders {
  "qlik-web-integration-id": string;
  "qlik-csrf-token": string;
}

export class QlikSaaSConnection {
  session: enigmaJS.ISession;
  global: EngineAPI.IGlobal;
  app: EngineAPI.IApp;

  private config: IQlikSaaSConfig;
  private fullUrl: string;
  private host: string;
  private params: string;
  private enigmaConfig: enigmaJS.IConfig;
  private headers: IQlikSaaSHeaders;
  private enigma: IEnigmaClass;
  private schema: { [k: string]: any };

  constructor(config: IQlikSaaSConfig, enigma: IEnigmaClass, schema: any) {
    if (!config) throw new Error(`Qlik SaaS: Session already created!`);
    if (!config.webIntegrationId)
      throw new Error(`Qlik SaaS: "config.webIntegrationId" is required`);
    if (!config.tenantDomain)
      throw new Error(`Qlik SaaS: "config.tenantDomain" is required`);

    if (!enigma) throw new Error(`Qlik SaaS: "enigma" is required`);
    if (!schema) throw new Error(`Qlik SaaS: "schema" is required`);

    this.enigma = enigma;
    this.schema = schema;
    this.config = config;
    this.fullUrl = `https://${this.config.tenantDomain}`;
    this.host = this.fullUrl.replace(/^https?:\/\//, "").replace(/\/?/, "");
  }

  async connect(): Promise<EngineAPI.IGlobal> {
    await this.prepare();
    this.session = this.enigma.create(this.enigmaConfig);
    this.global = await this.session.open();
    return this.global;
  }

  async connectAndOpenDoc(appId: string): Promise<EngineAPI.IApp> {
    if (!appId) throw new Error(`Qlik SaaS: "appId" is required`);

    await this.prepare(appId);
    this.session = this.enigma.create(this.enigmaConfig);
    this.global = await this.session.open();
    this.app = await this.global.openDoc(appId);
    return this.app;
  }

  private async prepare(appId?: string): Promise<void> {
    if (this.headers) throw new Error(`Qlik SaaS: Session already open`);

    this.headers = await this.getQCSHeaders();

    this.params = Object.entries(this.headers)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    const docId = appId ? appId : "engineData";

    const wsUri: string = `wss://${this.host}/app/${docId}?${this.params}`;

    this.enigmaConfig = {
      Promise: Promise,
      schema: this.schema,
      url: wsUri,
    };
  }

  private async getQCSHeaders(): Promise<IQlikSaaSHeaders> {
    const response = await fetch(`${this.fullUrl}/api/v1/csrf-token`, {
      credentials: "include",
      headers: { "qlik-web-integration-id": this.config.webIntegrationId },
    });

    if (response.status === 401) {
      const loginUrl: URL = new URL(`${this.fullUrl}/login`);
      loginUrl.searchParams.append("returnto", window.location.href);
      loginUrl.searchParams.append(
        "qlik-web-integration-id",
        this.config.webIntegrationId
      );
      window.location.href = loginUrl.toString();
      throw new Error("Unauthorized");
    }

    const csrfToken = new Map((response as any).headers).get("qlik-csrf-token");
    if (!csrfToken) throw new Error(`"qlik-csrf-token" not found`);

    return {
      "qlik-web-integration-id": this.config.webIntegrationId,
      "qlik-csrf-token": csrfToken.toString(),
    };
  }
}
