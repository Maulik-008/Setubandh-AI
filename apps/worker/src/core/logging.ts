import { LoggerModule } from 'nestjs-pino';
import { ENV, type AppEnv } from './env';

/** Structured JSON logs (Pino), same format as the API. Jobs log their jobId and tenantId. */
export const LoggingModule = LoggerModule.forRootAsync({
  inject: [ENV],
  useFactory: (env: AppEnv) => ({
    pinoHttp: {
      level: env.NODE_ENV === 'production' ? 'info' : env.NODE_ENV === 'test' ? 'silent' : 'debug',
      base: { service: 'worker' },
    },
  }),
});
