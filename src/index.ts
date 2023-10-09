//import got from 'got';
import { HrWorks, PersonBaseData } from './hrworks.js';
import * as graph from './graph.js';
import * as helper from './helper.js';
import settings from './graphSettings.js';

const hrWorks: HrWorks = new HrWorks();

//create the HRworks class instance
await hrWorks.createInstance();

// Creation of MSOffice365 boilerplate should happen here to prevent unnecessary load to HRworks in case of failure.
graph.initializeGraphForAppOnlyAuth(settings);

//Only check HRworks if MSOffice365 is available.
const hrworksMasterData = await hrWorks.fetchPersonMasterData();

const adMasterData: helper.UpnData[] =
  (await graph.listUsers()) as helper.UpnData[];
const matchedData: PersonBaseData[] = helper.matchUpnToMasterData(
  adMasterData,
  hrworksMasterData
);
helper.getMissingUsers(matchedData);
//hrWorks.filterMissingEMails(hrworksMasterData)

// Now, here we can check if the personellId of HRworks matches the employeeId on the directory element.
// This can later serve as unique identifier. For this check we will match the persons by email address.

//const filteredUsers: PersonBaseData[] = hrWorks.filterMissingEMails(masterData);
//logger.debug(filteredUsers);
