import got from 'got';

import { Logger } from 'tslog';

const logger = new Logger({ name: 'hrworks', minLevel: parseInt(process.env.LOG_LEVEL), maskPlaceholder: "***", maskValuesOfKeys: ["API_ACCESS_KEY_SECRET", "secretAccessKey"] });

interface PersonBaseData{
  firstName: string;
  lastName: string;
  personId: string;
  personnelNumber: string;
  datevPersonelNumber: string;
}
type ListPersonsResponse = Record<string, PersonBaseData[]>;

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

  async fetchPersonMasterData(): Promise<ListPersonsResponse> {
    try {
      const result: ListPersonsResponse = await this.gotInstance.get("persons", {searchParams: {onlyActive: true}}).json();
      logger.info("Successfully fetched person master data");
      logger.debug(result);
      return result;
    }catch (error) {
      logger.fatal({
        error: error})
    }
  }

  filterMissingEMails(masterData: ListPersonsResponse): PersonBaseData[] {
    const mergedUsers: PersonBaseData[] = [];

    if (process.env.MASTER_DATA_FILTER_REGEX_PATTERN !== "" && process.env.MASTER_DATA_FILTER_REGEX_PATTERN != undefined){
      for (const k in masterData){
        const filteredUsers = masterData[k].filter((personBaseData: PersonBaseData) =>{
            return personBaseData.personId.search(process.env.MASTER_DATA_FILTER_REGEX_PATTERN) === -1 ;
          })
        mergedUsers.push(...filteredUsers);
      }
      logger.info("Filtered users for regex: " + process.env.MASTER_DATA_FILTER_REGEX_PATTERN + ". Found " + mergedUsers.length + " elements");
      logger.debug({message: "Filtered users for regex expresssion",
                    "MASTER_DATA_FILTER_REGEX_PATTERN": process.env.MASTER_DATA_FILTER_REGEX_PATTERN,
                    "filteredUsers": mergedUsers});
      return mergedUsers;
    }else{
      logger.error({message: "MASTER_DATA_FILTER_REGEX_PATTERN is not defined"});
    }
  }
}





export { HrWorks, ListPersonsResponse, PersonBaseData };
