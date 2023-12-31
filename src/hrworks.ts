import { got, Response } from 'got';

import logger from './logger.js';
import PersonDetailData from './types/PersonDetailData.js'
interface PersonBaseData {
  firstName: string;
  lastName: string;
  personId: string;
  personnelNumber: string;
  datevPersonelNumber: string;
  orgUnit: string;
  adUserId?: string;
  userUpnCount?: number;
}
interface ReducedPersonDetailData{
  privateEmail: string;
  position: string;
  personnelNumber: string;
  lastName: string;
  firstName: string;
  personId: string;
  businessEmail?: string;
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
        API_URL: this.apiUrl
      });
    } else {
      logger.fatal({
        error:
          'Error reading environment variables. Make sure to define API_ACCESS_KEY_ID and API_ACCESS_KEY_SECRET'
      });
    }
  }

  async createInstance() {
    logger.debug('Creating custom got instance...');
    this.gotInstance = got.extend({
      prefixUrl: this.apiUrl,
      headers: {
        Authorization: 'Bearer ' + (await this.fetchToken())
      }
    });
  }

  private async fetchToken() {
    try {
      const result: { token: string } = await got
        .post(this.apiUrl + '/authentication', {
          json: {
            accessKey: this.apiAccessKeyId,
            secretAccessKey: this.apiAccessKeySecret
          }
        })
        .json();

      logger.debug({ API_ACCESS_KEY_SECRET: result.token });
      return result.token;
    } catch (error) {
      logger.fatal({
        message: 'Failed to obtain HRWorks API Token',
        apiUrl: this.apiUrl
      });
      logger.fatal({
        error: error.response.body
      });
    }
  }

  /**
   * Get the general person master data (limited set of fields)
   * @returns Promise<PersonBaseData[]>
   */
  async fetchPersonMasterData(): Promise<PersonBaseData[]> {
    try {
      const paginatedResponses = await this.gotInstance.paginate.all(
        'persons',
        {
          searchParams: {
            onlyActive: true
          },
          pagination: {
            // we have to put it into an array as the response is not valid json which the pagination api cannot handle
            transform: (response: Response): PersonBaseData[] => {
              const body = JSON.parse(response.body as string); // this is invalid as it's  {'key': PersonBaseData[]}
              const results = [];
              for (const orgUnit in body) {
                for (let i = 0; i < body[orgUnit].length; i++) {
                  body[orgUnit][i]['orgUnit'] = orgUnit; // add the organizational unit as attribute to the flat datastructure
                  results.push(body[orgUnit][i]);
                }
              }
              return results;
            }
          }
        }
      );
      logger.info(`Successfully fetched ${paginatedResponses.length} records person master data`);
      return paginatedResponses;
    } catch (error) {
      logger.fatal({
        error: error
      });
    }
  }


 /**
  * You can use this to reduce any set of extensive PersonDetailData to a limited number of fields in ReducedPersonDetailData.
  * @param personDetailData An response from persons/master-data (or fetchDetailMasterData)
  * @returns ReducedPersonDetailData[]
  */
  reduceMasterData(personDetailData: PersonDetailData[]): ReducedPersonDetailData[] {
    try {
      return personDetailData.map(person => {
        return {
          privateEmail: person.privateEmail,
          position: person.position,
          personnelNumber: person.personnelNumber,
          lastName: person.lastName,
          firstName: person.firstName,
          personId: person.personId
        }
      })
    } catch (error) {
      logger.fatal({
        error: error
      });
  }
}

  /**
   * Get's the detailed person master data for a set of PersonBaseData[]
   * @param personBaseData The personBaseData which id's will be used to obtain the full master-data of this user
   * @returns Promise<PersonDetailData[]>
   */
  async fetchDetailMasterData(personBaseData: PersonBaseData[]): Promise<PersonDetailData[]> {
    try {
      const personIds = personBaseData.map(person => person.personId);
      const paginatedResponses: PersonDetailData[] = await this.gotInstance.paginate.all(
        'persons/master-data',
        {
          searchParams: {
            persons: `[${personIds.toString()}]`,
            onlyActive: true
          },
          pagination: {
            // we have to put it into an array as the response is not valid json which the pagination api cannot handle
            transform: (response: Response) => {
              const body = JSON.parse(response.body as string); // this is invalid as it's  {'key': PersonBaseData[]}
              const results = [];
              results.push(...body.persons);
              return results;
            }
          }
        });
        logger.info(`Successfully fetched ${paginatedResponses.length} records person master detail data`);
        return paginatedResponses;
      } catch (error) {
        logger.fatal({
          error: error
        });
      }
    };


  /**
   * DEPRECATED.
   * @param masterData
   * @returns
   */
  filterMissingEMails(masterData: PersonBaseData[]): PersonBaseData[] {
    let filteredUsers: PersonBaseData[] = [];
    const excludedPersonnelNumbers =
      process.env.EXCLUDED_PERSONNEL_NUMBERS.split(',');
    if (
      process.env.MASTER_DATA_FILTER_REGEX_PATTERN !== '' &&
      process.env.MASTER_DATA_FILTER_REGEX_PATTERN != undefined
    ) {
      filteredUsers = masterData.filter((personBaseData: PersonBaseData) => {
        if (
          personBaseData.personId.search(
            process.env.MASTER_DATA_FILTER_REGEX_PATTERN
          ) === -1 &&
          excludedPersonnelNumbers.indexOf(personBaseData.personnelNumber) ===
            -1
        ) {
          return true;
        }
      });
      logger.info(
        'Filtered users for regex: ' +
          process.env.MASTER_DATA_FILTER_REGEX_PATTERN +
          '. Found ' +
          filteredUsers.length +
          ' elements'
      );
      logger.debug({
        message: 'Filtered users for regex expression & excluded users',
        MASTER_DATA_FILTER_REGEX_PATTERN:
          process.env.MASTER_DATA_FILTER_REGEX_PATTERN,
        EXCLUDED_PERSONNEL_NUMBERS: process.env.EXCLUDED_PERSONNEL_NUMBERS,
        filteredUsers: filteredUsers
      });
      return filteredUsers;
    } else {
      logger.error({
        message: 'MASTER_DATA_FILTER_REGEX_PATTERN is not defined'
      });
    }
  }
}

export { HrWorks, PersonBaseData, ReducedPersonDetailData };
