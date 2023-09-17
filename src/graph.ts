import {AppSettings} from  "./graphSettings.js";
import {Client} from '@microsoft/microsoft-graph-client';
import {ClientSecretCredential} from '@azure/identity';
import {TokenCredentialAuthenticationProvider} from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js'
import logger from './logger.js';
import { error } from "console";


let clientSecretCredentials: ClientSecretCredential | undefined = undefined;
let appClient: Client | undefined = undefined;

export function initializeGraphForAppOnlyAuth(settings: AppSettings) {

    if(!settings){
      logger.fatal({message:"Settings for Graph not set correctly"});
    }

    if(!clientSecretCredentials){
      clientSecretCredentials = new ClientSecretCredential(
        settings.tenantId,
        settings.clientId,
        settings.clientSecret
      );
    }

    if(!appClient) {
      const authProvider = new TokenCredentialAuthenticationProvider(clientSecretCredentials, {
        scopes: ['https://graph.microsoft.com/.default']
      });

      appClient = Client.initWithMiddleware({authProvider: authProvider});
    }
}
//Only necessary for debugging if you'd like to check the token.
export async function getAppOnlyToken(): Promise<string> {
  try {
  if(!clientSecretCredentials){
    logger.fatal({message:"No clientSecretCredentials defined"});
  }
  const response = await clientSecretCredentials.getToken([
    'https://graph.microsoft.com/.default'
  ]);
  logger.debug({message: "Received token from AzureAD", token: response.token});
  return response.token;
  }catch (error){
    logger.fatal({message: "Error getting app only token from AzureAD", error: error})
  }
}

export async function searchUserId() {

  return appClient.api("/users").get();


}