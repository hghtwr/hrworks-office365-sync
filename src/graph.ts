import { AppSettings } from './graphSettings.js';
import {
  Client,
  PageCollection,
  PageIterator,
  PageIteratorCallback
} from '@microsoft/microsoft-graph-client';
import { SubscribedSku, User } from '@microsoft/microsoft-graph-types';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';
import logger from './logger.js';
import { ReducedPersonDetailData } from './hrworks.js';
import { getRandomValues, randomBytes, randomInt } from 'crypto';
import { rmdir } from 'fs';
import { count } from 'console';

let clientSecretCredentials: ClientSecretCredential | undefined = undefined;
let appClient: Client | undefined = undefined;

export function initializeGraphForAppOnlyAuth(settings: AppSettings) {
  if (!settings) {
    logger.fatal({ message: 'Settings for Graph not set correctly' });
  }

  if (!clientSecretCredentials) {
    clientSecretCredentials = new ClientSecretCredential(
      settings.tenantId,
      settings.clientId,
      settings.clientSecret
    );
  }

  if (!appClient) {
    const authProvider = new TokenCredentialAuthenticationProvider(
      clientSecretCredentials,
      {
        scopes: ['https://graph.microsoft.com/.default']
      }
    );

    appClient = Client.initWithMiddleware({ authProvider: authProvider });
  }
}

//Only necessary for debugging if you'd like to check the token.
export async function getAppOnlyToken(): Promise<string> {
  try {
    if (!clientSecretCredentials) {
      logger.fatal({ message: 'No clientSecretCredentials defined' });
    }
    const response = await clientSecretCredentials.getToken([
      'https://graph.microsoft.com/.default'
    ]);
    logger.debug({
      message: 'Received token from AzureAD',
      token: response.token
    });
    return response.token;
  } catch (error) {
    logger.fatal({
      message: 'Error getting app only token from AzureAD',
      error: error
    });
  }
}

export async function listUsers(select?: string[], filter?: string): Promise<User[]> {
  const results = [];
  select = (select) ? select : [""];
  filter = (filter) ? filter : "";
  const response: PageCollection = await appClient
    .api('/users?$top=999')
    .select(select)
    .filter(filter)
    .get();
  const callback: PageIteratorCallback = (result) => {
    results.push(result);
    return true;
  };
  const pageIterator = new PageIterator(appClient, response, callback);

  await pageIterator.iterate();
  return results;
}

export async function getSkuId(
  settings: AppSettings
): Promise<SubscribedSku['skuId']> {
  if (!settings.defaultSku) {
    logger.fatal({ message: 'No default SKU defined' });
  } else {
    // https://learn.microsoft.com/en-us/graph/api/subscribedsku-list?view=graph-rest-1.0&tabs=javascript#http-request
    // This resource does not support $filter, so we have to filter it on our own.
    try {
      let skus: SubscribedSku[] = await listSubscribedSkus();
      skus = skus.filter((sku) => {
        return sku.skuPartNumber == settings.defaultSku;
      });
      if (skus.length === 1) {
        logger.info('Found default skuId' + skus[0].skuId);
        return skus[0].skuId;
      } else {
        logger.fatal({ message: 'More than 1 SKU found for default SKU' });
      }
    } catch (error) {
      logger.fatal({
        message: "Fatal error filtering the default SKU's",
        error: error
      });
    }
  }
}

async function listSubscribedSkus(): Promise<SubscribedSku[]> {
  try {
    return (await appClient.api('/subscribedSkus').get()).value;
  } catch (error) {
    logger.fatal({
      message: "Error reading subscribed SKU's",
      error: error
    });
  }
}

/**
 * This will take a string and replace the umlauts (ü, ä, ö, ß) by its corresponding asci pendandt (ue, ae, oe, ss)
 * @param email string for email
 * @returns
 */
function replaceUmlaut(email: string){
  email = email.replace(/\u00fc/g, "ue")
  email = email.replace(/\u00e4/g, "ae")
  email = email.replace(/\u00f6/g, "oe")
  email = email.replace(/\u00df/g, "ss")
  return email;

}

/**
 *
 * @param personBaseData
 *
 */
async function getFreshUpn(personBaseData: ReducedPersonDetailData) {
  let normalizedName = replaceUmlaut((`${personBaseData.firstName}.${personBaseData.lastName}`).replace(" ", "-").toLowerCase());
  //let existingUser = await listUsers([""], "filter");

  let existingUser = await listUsers(undefined, `mail eq '${normalizedName}${process.env.EMAIL_DOMAIN}'`);
  let suffix = 1;
  logger.debug({
    message: "Checking for existing users",
    existingUser: existingUser
  });
  while(existingUser.length != 0) {
    normalizedName = normalizedName+suffix;
    existingUser = await listUsers([], `'mail eq '${normalizedName}${process.env.EMAIL_DOMAIN}'`);
    suffix++;
  }

  return normalizedName
}

/**
 * Will prepare user objects and then send them to AAD for the user to be created.
 * It will use getFreshUpn to determine a upn from firstname.lastname.
 * If the user already exists, it will suffix the upn with -1, -2, -3, etc.
 * @param reducedPersonBaseData[] The reduced data for the user  from hrWorks.reduceMasterData
 * @returns reducedPersonBaseData[] extended with additional field of businessMail
 */
export function scaffoldAndCreateUsers(reducedPersonBaseData: ReducedPersonDetailData[]): Promise<ReducedPersonDetailData>[]{
  return reducedPersonBaseData.map(async person => {
    try {
      const upnName = await getFreshUpn(person);

      const createObject = {
        accountEnabled: true,
        displayName: `${person.firstName} ${person.lastName}`,
        mailNickname: upnName,
        passwordProfile: {
          "forceChangePasswordNextSignIn": true,
          "forceChangePasswordNextSignInWithMfa": false,
          "password": createRandomPassword()
        },
        userPrincipalName: `${upnName}${process.env.EMAIL_DOMAIN}`
      }
      logger.debug({
        message: `Scaffold user for ${person.personnelNumber}: ${person.lastName}, ${person.firstName}.`,
        createObject: createObject,
      });

      await createUser(createObject);
      person.businessEmail = createObject.userPrincipalName
      return person;

    }catch (error) {
      logger.info({
        message: "Error scaffolding user",
        error: error
      })
    }
  });
}
/**
 *
 * @param createObject The payload for user creation as described in https://learn.microsoft.com/en-us/graph/api/user-post-users?view=graph-rest-1.0&tabs=javascript
 * @returns AAD User https://graph.microsoft.com/v1.0/$metadata#users/$entity
 */
async function createUser(createObject: User) {
  try {

      const response = await appClient.api('/users/').post(createObject);
      logger.debug({

        message: `POST to /users`,
        response: response,
      })
      const user: User = response.body;
      return user;
  }catch (error) {
    logger.info({
      message: "Error creating user",
      error: error
    })
  }
}

export function createRandomPassword(){

  // Need some special chars in that password
  //Create base password (numbers + lowercase chars);
  let randomString = randomBytes(24).toString('hex');
  const specials = ["!", "?", "$", "§", "%", "-", ".", " ", ",", ";", ".", "#", "~"];
  let countSpecials = 0;
  let countUppercase = 0;

  while(countSpecials == 0 || countUppercase == 0) {
  //Give every char the chance to be replaced by special char or uppercase letter
  for(let i = 0; i < randomInt(1, randomString.length); i++){
    //Not every char should be replaced, only with change < 0.3
    if(randomInt(1,11) > 6) {
      randomString = randomString.substring(0,i) + specials[randomInt(1, specials.length)] + randomString.substring(i+1);
      countSpecials++;
    // Let add another chance of 50% of replacing a char by an uppercase letter
  }else if (randomString[i].match(/[a-z]/i) && randomInt(1,11) <= 5) {

    randomString = randomString.substring(0,i) + randomString[i].toUpperCase() + randomString.substring(i+1);
    countUppercase++;
    }
  }
}


  return randomString;
}
