export interface IQlikSaaSConfig {
  webIntegrationId: string;
  tenantDomain: string;
}

export interface IQlikSaaSHeaders {
  "qlik-web-integration-id": string;
  "qlik-csrf-token": string;
}

export class QlikSaaSConnection {
  /**
   * Qlik session object
   */
  session: enigmaJS.ISession;
  /**
   * Global object
   */
  global: EngineAPI.IGlobal;
  /**
   * App object
   */
  app: EngineAPI.IApp;
  csrfToken: string;
  readonly appId: string;
  readonly identity: string;

  private config: IQlikSaaSConfig;
  private fullUrl: string;
  private host: string;
  private params: string;
  private enigmaConfig: enigmaJS.IConfig;
  private headers: IQlikSaaSHeaders;
  private enigma: IEnigmaClass;
  private schema: { [k: string]: any };

  constructor(
    config: IQlikSaaSConfig,
    enigma: IEnigmaClass,
    schema: any,
    appId: string,
    /**
     * Optional. Use useBuildIn OR value
     * If want to connect to specific engine session/identity
     * useBuildIn - identity id (uuid) will be auto generated when connecting
     * value - user provided value
     */
    identity?: {
      useBuildIn?: boolean;
      value?: string;
    }
  ) {
    if (!config) throw new Error(`Qlik SaaS: Session already created!`);
    if (!config.webIntegrationId)
      throw new Error(`Qlik SaaS: "config.webIntegrationId" is required`);
    if (!config.tenantDomain)
      throw new Error(`Qlik SaaS: "config.tenantDomain" is required`);
    if (!enigma) throw new Error(`Qlik SaaS: "enigma" is required`);
    if (!schema) throw new Error(`Qlik SaaS: "schema" is required`);
    if (!appId) throw new Error(`Qlik SaaS: "appId" is required`);

    this.appId = appId;
    this.enigma = enigma;
    this.schema = schema;
    this.config = config;

    let identityValue: string = identity?.useBuildIn
      ? `/identity/${this.uuid()}`
      : identity?.value
      ? `/identity/${identity.value}`
      : "";

    if (identityValue.length > 0) this.identity = identityValue.split("/")[2];

    this.fullUrl = `https://${this.config.tenantDomain}`;
    this.host = this.fullUrl.replace(/^https?:\/\//, "").replace(/\/?/, "");

    const wsUri: string = `wss://${this.host}/app/${appId}?$PARAMS${identityValue}`;

    this.enigmaConfig = {
      Promise: Promise,
      schema: this.schema,
      url: wsUri,
    };
  }

  /**
   * Establish Qlik connection
   */
  async connect(
    /** List of events to be logged to console. For example: traffic:send, traffic:received */
    logEvents?: string[]
  ): Promise<EngineAPI.IGlobal> {
    await this.prepare();
    this.session = this.enigma.create(this.enigmaConfig);

    if (logEvents && logEvents.length > 0) {
      logEvents.forEach((event) => {
        if (event.indexOf(":*") > -1) {
          this.session.on(event, (eventName: string, data: any) =>
            console.log(`${event} - ${eventName}:`, data)
          );
        } else {
          this.session.on(event, (data: any) => console.log(`${event}:`, data));
        }
      });
    }

    this.global = await this.session.open();
    this.app = await this.global.openDoc(this.appId);
    return this.global;
  }

  /**
   * Close the connection
   */
  async disconnect() {
    await this.session.close();
  }

  private async prepare(): Promise<void> {
    if (this.headers) throw new Error(`Qlik SaaS: Session already open`);

    this.headers = await this.getQCSHeaders();

    this.params = Object.entries(this.headers)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    this.enigmaConfig.url = this.enigmaConfig.url.replace(
      "$PARAMS",
      this.params
    );
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

    const csrfToken = new Map<string, string>((response as any).headers).get(
      "qlik-csrf-token"
    );
    if (!csrfToken) throw new Error(`"qlik-csrf-token" not found`);

    this.csrfToken = csrfToken.toString();
    return {
      "qlik-web-integration-id": this.config.webIntegrationId,
      "qlik-csrf-token": csrfToken.toString(),
    };
  }

  private uuid(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }
}
