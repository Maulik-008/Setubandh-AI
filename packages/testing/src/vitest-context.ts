// Values the integration globalSetup provides to tests: `inject('postgresUrl')`, `inject('valkeyUrl')`;
// the API's setup (`global-setup-services`) also provides `inject('mailpit')` and `inject('s3')`.
declare module 'vitest' {
  export interface ProvidedContext {
    postgresUrl: string;
    valkeyUrl: string;
    mailpit: { smtpHost: string; smtpPort: number; apiUrl: string };
    s3: { endpoint: string; bucket: string; accessKey: string; secretKey: string };
  }
}

export {};
