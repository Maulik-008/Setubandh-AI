import type { TestProject } from 'vitest/node';
import { startMailpit, startS3, startTestInfra } from './containers';

import './vitest-context';

/**
 * Vitest globalSetup for the API's integration tests: Postgres and Valkey as in `global-setup`,
 * plus Mailpit (email) and SeaweedFS (S3 file storage). Other packages keep the lighter setup.
 */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const [infra, mailpit, s3] = await Promise.all([startTestInfra(), startMailpit(), startS3()]);
  project.provide('postgresUrl', infra.postgresUrl);
  project.provide('valkeyUrl', infra.valkeyUrl);
  project.provide('mailpit', {
    smtpHost: mailpit.smtpHost,
    smtpPort: mailpit.smtpPort,
    apiUrl: mailpit.apiUrl,
  });
  project.provide('s3', {
    endpoint: s3.endpoint,
    bucket: s3.bucket,
    accessKey: s3.accessKey,
    secretKey: s3.secretKey,
  });
  return async () => {
    await Promise.all([infra.stop(), mailpit.stop(), s3.stop()]);
  };
}
