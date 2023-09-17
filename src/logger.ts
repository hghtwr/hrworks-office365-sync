import { Logger } from 'tslog';
const logger = new Logger({ name: 'log', minLevel: parseInt(process.env.LOG_LEVEL) });


export default logger;
