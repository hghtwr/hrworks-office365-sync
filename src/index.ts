//import got from 'got';
import { Logger } from 'tslog';
import { HrWorks, ListPersonsResponse, PersonBaseData } from './hrworks.js';

const logger = new Logger({ name: 'log', minLevel: parseInt(process.env.LOG_LEVEL) });

logger.info('Starting');

const hrWorks: HrWorks = new HrWorks();

//create the HRworks class instance
await hrWorks.createInstance();

const masterData: ListPersonsResponse = await hrWorks.fetchPersonMasterData();
const filteredUsers: PersonBaseData[] = hrWorks.filterMissingEMails(masterData);



