import {got, Response} from 'got';

import logger from './logger.js';


interface PersonBaseData{
  firstName: string;
  lastName: string;
  personId: string;
  personnelNumber: string;
  datevPersonelNumber: string;
  orgUnit: string;
}

class HrWorks {
  apiAccessKeyId: string;
  apiAccessKeySecret: string;
  apiToken: string;
  apiUrl: string;
  gotInstance: typeof got;

   constructor() {
    this.apiToken = '';
    this.apiAccessKeyId = '';
    this.apiAccessKeySecret = '';
    this.apiUrl = '';
    if (
      process.env.API_ACCESS_KEY_ID &&
      process.env.API_ACCESS_KEY_SECRET &&
      process.env.API_URL
    ) {
      this.apiAccessKeyId = process.env.API_ACCESS_KEY_ID;
      this.apiAccessKeySecret = process.env.API_ACCESS_KEY_SECRET;
      this.apiUrl = process.env.API_URL;
      logger.info(
        'Successfully read API_ACCESS_KEY_ID and API_ACCESS_KEY_SECRET'
      );
      logger.debug({
        API_ACCESS_KEY_ID: this.apiAccessKeyId,
        API_ACCESS_KEY_SECRET: this.apiAccessKeySecret,
        API_URL: this.apiUrl});
    } else {
      logger.fatal({
        error: 'Error reading environment variables. Make sure to define API_ACCESS_KEY_ID and API_ACCESS_KEY_SECRET'
      });
    }
  }

  async createInstance(){
    logger.debug("Creating custom got instance...");
    this.gotInstance =  got.extend({
      prefixUrl: this.apiUrl,
      headers: {
        Authorization: "Bearer "+ await this.fetchToken()
      }
    });
  }

  async fetchToken() {
    try {
      const result: { token: string } = await got
        .post(this.apiUrl + '/authentication', {
          json: {
            accessKey: this.apiAccessKeyId,
            secretAccessKey: this.apiAccessKeySecret
          }
        }).json();

      logger.debug({API_ACCESS_KEY_SECRET: result.token});
      return result.token;
    } catch (error) {
      logger.fatal({message: 'Failed to obtain HRWorks API Token',
                    apiUrl: this.apiUrl}
      );
      logger.fatal({
        error: error.response.body
      });
    }
  }


  async fetchPersonMasterData(): Promise<PersonBaseData[]> {
    try {
      const paginatedResponses = await this.gotInstance.paginate.all("persons", {
        pagination: {
          // we have to put it into an array as the response is not valid json which the pagination api cannot handle
        transform: (response: Response): PersonBaseData[] =>{
          const body = JSON.parse(response.body as string); // this is invalid as it's  {'key': PersonBaseData[]}
          const results = []
          for (const orgUnit in body){
            for (let i = 0; i < body[orgUnit].length; i++){

              body[orgUnit][i]["orgUnit"]= orgUnit;             // add the organizational unit as attribute to the flat datastructure
              results.push(body[orgUnit][i]);
            }
          }
          return results;
        }
      }
    });
    logger.debug(paginatedResponses);
    logger.info("Successfully fetched person master data");
    return paginatedResponses;
    }catch (error) {
      logger.fatal({
      error: error})
    }
  }

  filterMissingEMails(masterData: PersonBaseData[]): PersonBaseData[] {
    let filteredUsers: PersonBaseData[] = [];
    if (process.env.MASTER_DATA_FILTER_REGEX_PATTERN !== "" && process.env.MASTER_DATA_FILTER_REGEX_PATTERN != undefined){
          filteredUsers = masterData.filter((personBaseData: PersonBaseData) =>{
            return personBaseData.personId.search(process.env.MASTER_DATA_FILTER_REGEX_PATTERN) === -1 ;
          });
      logger.info("Filtered users for regex: " + process.env.MASTER_DATA_FILTER_REGEX_PATTERN + ". Found " + filteredUsers.length + " elements");
      logger.debug({message: "Filtered users for regex expresssion",
                    "MASTER_DATA_FILTER_REGEX_PATTERN": process.env.MASTER_DATA_FILTER_REGEX_PATTERN,
                    "filteredUsers": filteredUsers});
      return filteredUsers;
    }else{
      logger.error({message: "MASTER_DATA_FILTER_REGEX_PATTERN is not defined"});
    }
  }
}





export { HrWorks, PersonBaseData };
