//import got from 'got';
import { HrWorks, ListPersonsResponse, PersonBaseData } from './hrworks.js';
import * as graph from './graph.js';
import settings from './graphSettings.js';
import logger from './logger.js';

//const hrWorks: HrWorks = new HrWorks();

//create the HRworks class instance
//await hrWorks.createInstance();


// Creation of MSOffice365 boilerplate should happen here to prevent unnecessary load to HRworks in case of failure.

graph.initializeGraphForAppOnlyAuth(settings);
logger.debug(await graph.searchUserId());


// Only check HRworks if MSOffice365 is available.
//const masterData: ListPersonsResponse = await hrWorks.fetchPersonMasterData();
//const filteredUsers: PersonBaseData[] = hrWorks.filterMissingEMails(masterData);



