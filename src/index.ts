//import got from 'got';
import { HrWorks, PersonBaseData, ReducedPersonDetailData } from './hrworks.js';
import * as graph from './graph.js';
import * as helper from './helper.js';
import settings from './graphSettings.js';
import logger from './logger.js';
const hrWorks: HrWorks = new HrWorks();

//create the HRworks class instance
await hrWorks.createInstance();

// Creation of MSOffice365 boilerplate should happen here to prevent unnecessary load to HRworks in case of failure.
graph.initializeGraphForAppOnlyAuth(settings);

//Only check HRworks if MSOffice365 is available.
//Now get all master data from HRworks and ad so we can check for UPN's existing later.
const hrworksMasterData = await hrWorks.fetchPersonMasterData();
const adMasterData: helper.UpnData[] =
  (await graph.listUsers()) as helper.UpnData[];


// Add the UPN to the masterdata so we can do all sorts of data updates on later on AzureAD.
const matchedData: PersonBaseData[] = helper.matchUpnToMasterData(
  adMasterData,
  hrworksMasterData
);

// Next steps depend on the work mode
if(process.env.MODE === "Create" || process.env.MODE === "CreateSync") {

  const missingUsers = helper.getMissingUsers(matchedData);
  //Enrichen the affected metadata by additional necessary fields. This function can be reused for other updates on AAD as well.
  let reducedDetailMasterData: ReducedPersonDetailData = hrWorks.reduceMasterData(await hrWorks.fetchDetailMasterData(missingUsers));
  // Now we can go ahead and create the user in AAD. Later it will be synced if sync mode is in CreateSync.
  // TO-DO: Add user add procedure to AAD
}

if(process.env.MODE === "Sync" || process.env.MODE === "CreateSync"){
  // TO-DO: Add functionality to synchronize AAD users and hrworks. It should be based on personId(HRworks) == upn(AAD)
  // ...it should NOT update the dataset if employeeId(AAD) !== personnelNumber(HRworks).

}

//Get the users that have no personId that matches the regex yet. These users have to be created in AAD later.




// Now, here we can check if the personellId of HRworks matches the employeeId on the directory element.
// This can later serve as unique identifier. For this check we will match the persons by email address.

//const filteredUsers: PersonBaseData[] = hrWorks.filterMissingEMails(masterData);
//logger.debug(filteredUsers);
