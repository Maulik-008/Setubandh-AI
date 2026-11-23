// Values the integration globalSetup provides to tests: `inject('postgresUrl')`, `inject('valkeyUrl')`.
declare module 'vitest' {
  export interface ProvidedContext {
    postgresUrl: string;
    valkeyUrl: string;
  }
}

export {};
