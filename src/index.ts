//import got from 'got';
import { Logger } from 'tslog';
import { HrWorks } from './hrworks.js';

const logger = new Logger({ name: 'log', minLevel: 2 });

logger.info('Starting');

const hrWorks: HrWorks = new HrWorks();

await hrWorks.createInstance();
await hrWorks.fetchOnboardingDocuments();