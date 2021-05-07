const { createLogger, format, transports } = require('winston');

const { ArgumentParser } = require('argparse');

const parser = new ArgumentParser({
  add_help: true,
  description: 'Custom Logs Level CLI',
});
parser.add_argument('-v', '--verbose', {
  help: 'verbose output',
  action: 'count',
});
const args = parser.parse_args();

function getLogingLevel(config) {
  let level = 'error';

  const verbose = config.verbose || false;

  if (verbose) {
    level = 'debug';
  }

  return level;
}

// Configure the Winston logger. For the complete documentation see https://github.com/winstonjs/winston
const logger = createLogger({
  // To see more detailed errors, change this to 'debug'
  level: getLogingLevel(args),
  format: format.combine(format.splat(), format.simple()),
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    new transports.File({ filename: './logs/error.log', level: 'error' }),
    new transports.File({ filename: './logs/combined.log' }),
    new transports.Console({
      format: format.simple(),
    }),
  ],
});

module.exports = logger;
