import { PersonBaseData } from './hrworks.js';
import logger from './logger.js';

export interface UpnData {
  employeeId: string;
  userPrincipalName: string;
  id: string;
}
/*
export function buildEmailAddress(baseData: PersonBaseData) {}
*/

/**
 *
 * @param upnData
 * @param baseData
 * @returns
 */
export function matchUpnToMasterData(
  upnData: UpnData[],
  baseData: PersonBaseData[]
): PersonBaseData[] {
  return baseData
    .map((person) => {
      const filteredUpnData = upnData.filter((upnUser) => {
        return upnUser.userPrincipalName === person.personId;
      });

      if (filteredUpnData.length === 1) {
        person.adUserId = filteredUpnData[0].id;
        person.userUpnCount = 1;
        return person;
      } else {
        logger.debug({
          message: `Found ${filteredUpnData.length} upn's for ${person.personId}`,
          filteredUpnData: filteredUpnData,
          person: person
        });
        person.userUpnCount = filteredUpnData.length;
        return person;

      }
    })
    .filter((person) => {
      return person !== undefined;
    });
}

export function getMissingUsers(personBaseData: PersonBaseData[]): PersonBaseData[]{
  let filteredUsers: PersonBaseData[] = [];
  const excludedPersonnelNumbers =
    process.env.EXCLUDED_PERSONNEL_NUMBERS.split(',');
  if (
    process.env.MASTER_DATA_FILTER_REGEX_PATTERN !== '' &&
    process.env.MASTER_DATA_FILTER_REGEX_PATTERN != undefined
  ) {
    filteredUsers = personBaseData.filter((personBaseData: PersonBaseData) => {
      return (
        personBaseData.personId.search(
          process.env.MASTER_DATA_FILTER_REGEX_PATTERN
        ) === -1 &&
        excludedPersonnelNumbers.indexOf(personBaseData.personnelNumber) ===
          -1 && personBaseData.userUpnCount === 0
      )
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