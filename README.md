# Qlik SaaS Web Auth

Small package to handle **web** authentication when connecting to Qlik Sense SaaS edition

## Install

`npm install --save qlik-saas-web-auth`

The package require have `enigma.js` as `peerDependencies` (aka `enigma.js` have to be installed separately and passed to the package)

## Usage

- Connect to global

  ```javascript
  import enigma from "enigma.js";
  import schema from "enigma.js/schemas/12.67.2.json";

  import { QlikSaaSConnection } from "qlik-saas-web-auth";

  const qlik = new QlikSaaSConnection(
    {
      webIntegrationId: "some-web-integration-id",
      tenantDomain: "tenant.xx.qlikcloud.com",
    },
    enigma,
    schema
  );

  await qlik.connect();
  console.log(qlik.global);
  const app = await qlik.global.openDoc("some-doc-id");

  await qlik.session.close();
  ```

- Connect to specific app

  ```javascript
  import enigma from "enigma.js";
  import schema from "enigma.js/schemas/12.67.2.json";

  import { QlikSaaSConnection } from "qlik-saas-web-auth";

  const qlik = new QlikSaaSConnection(
    {
      webIntegrationId: "some-web-integration-id",
      tenantDomain: "tenant.xx.qlikcloud.com",
    },
    enigma,
    schema
  );

  await qlik.connectAndOpenDoc("some-doc-id");
  console.log(qlik.global);
  console.log(qlik.app);

  await qlik.session.close();
  ```
