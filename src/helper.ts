import { PersonBaseData } from './hrworks.js';
import logger from './logger.js';

export interface UpnData {
  employeeId: string;
  userPrincipalName: string;
  id: string;
}

export function buildEmailAddress(baseData: PersonBaseData) {}

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
        return person;
      } else {
        logger.debug({
          message: `Found ${filteredUpnData.length} upn's for ${person.personId}`,
          filteredUpnData: filteredUpnData,
          person: person
        });
      }
    })
    .filter((person) => {
      return person !== undefined;
    });
}
