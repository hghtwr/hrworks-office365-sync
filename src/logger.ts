import { Logger } from 'tslog';
const logger = new Logger({
  name: 'log',
  minLevel: parseInt(process.env.LOG_LEVEL),
  maskPlaceholder: '***',
  maskValuesOfKeys: ['API_ACCESS_KEY_SECRET', 'secretAccessKey']
});

export default logger;
