//import got from 'got';
import {Logger} from 'tslog';

const logger = new Logger({name: 'log', minLevel: 2});

logger.info('Starting');
if (process.env.API_ACCESS_KEY_ID && process.env.API_ACCESS_KEY_SECRET) {
  const apiAccessKeyId = process.env.API_ACCESS_KEY_ID;
  const apiAccessKeySecret = process.env.API_ACCESS_KEY_SECRET;
  logger.info('Successfully read API_ACCESS_KEY_ID and API_ACCESS_KEY_SECRET');
  logger.debug('API_ACCESS_KEY_ID: ' + apiAccessKeyId);
  logger.debug('API_ACCESS_KEY_SECRET: ' + apiAccessKeySecret);
} else {
  logger.fatal(
    new Error(
      'Error reading environment variables. Make sure to define API_ACCESS_KEY_ID and API_ACCESS_KEY_SECRET'
    )
  );
}
