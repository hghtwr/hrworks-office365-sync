import got from 'got';

import { Logger } from 'tslog';

const logger = new Logger({ name: 'hrworks', minLevel: 2, maskPlaceholder: "***", maskValuesOfKeys: ["API_ACCESS_KEY_SECRET", "secretAccessKey"] });

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
      logger.fatal(
        new Error(
          'Error reading environment variables. Make sure to define API_ACCESS_KEY_ID and API_ACCESS_KEY_SECRET'
        )
      );
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
        })
        .json();
      logger.debug({API_ACCESS_KEY_SECRET: result.token});
      return result.token;
    } catch (error) {
      logger.fatal(
        'Failed to obtain HRWorks API Token using URL: ' + this.apiUrl
      );
      logger.fatal({
        error: error.response.body
      });
    }
  }
  async fetchOnboardingDocuments(){
    try {
      const result = await this.gotInstance.get("persons/onboarding").json();
      logger.debug(result);
    }catch (error){
      logger.fatal({
        error: error})

    }
  }
}

export { HrWorks };
