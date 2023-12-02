import { AppSettings } from './graphSettings.js';
import {
  Client,
  PageCollection,
  PageIterator,
  PageIteratorCallback
} from '@microsoft/microsoft-graph-client';
import { Person, SubscribedSku, User } from '@microsoft/microsoft-graph-types';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';
import logger from './logger.js';
import { PersonBaseData, ReducedPersonDetailData } from './hrworks.js';
import { create } from 'domain';

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
  //return (await appClient.api("/users").select(select).get()).value;

  // return appClient.api("/users?$select=displayName,assignedPlans,assignedLicenses").get();
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

  while(existingUser.length != 0) {
    normalizedName = normalizedName+suffix;
    existingUser = await listUsers(["select"], `filter`);

    //existingUser = await listUsers([], `'equals(mail,\'${normalizedName}${process.env.EMAIL_DOMAIN}\')'`);
    suffix++;
  }

  return `${normalizedName}${process.env.EMAIL_DOMAIN}`;
}

export async function createUsers(personBaseData: ReducedPersonDetailData[]) {
  for (let i = 0; i < personBaseData.length; i++) {
    try {
      const upn = await getFreshUpn(personBaseData[i]);

      const createObject = {
        accountEnabled: true,
        displayName: `${personBaseData[i].firstName} ${personBaseData[i].lastName}`,
        mailNickname: upn,
        passwordProfile: {
          "forceChangePasswordNextSignIn": true,
          "forceChangePasswordNextSignInWithMfa": false,
          "password": "string"
        },
        userPrincipleName: upn
      }
      logger.debug({
        message: `Create user for ${personBaseData[i].personnelNumber}: ${personBaseData[i].lastName}, ${personBaseData[i].firstName}.`,
        createObject: createObject,
      });
    }catch (error) {
      logger.info({
        message: "Error creating user",
        error: error
      })
    }

  }
}


