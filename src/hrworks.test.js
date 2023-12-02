import {describe, expect, test} from '@jest/globals';
import {HrWorks} from './hrworks.js'
import { got, Response } from 'got';


jest.mock(HrWorks.gotInstance);

test('should fetch master data from Hrworks', async () => {


  const hrWorks = new HrWorks();
  await hrWorks.createInstance();

  const users = [{'TR': [{
    firstName: "Johannes",
    lastName: "Sonner"
  }]}]

  hrWorks.gotInstance.paginate.all.mockResolvedValue(users);

  const result = hrWorks.fetchPersonMasterData();




});