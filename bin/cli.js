#!/usr/bin/env node
'use strict';

const { gatherTelemetryForUrl, analyzeEmberObject } = require('ember-codemods-telemetry-helpers');

const argv = require('yargs').command(
  '$0 <url>',
  'A codemod for transforming your ember app code to native JavaScript class syntax with decorators!',
  yargs => {
    yargs
      .positional('url', {
        describe: 'the path to the server',
        type: 'string',
      })
      .option('class-fields', {
        description: 'Enable/disable transformation using class fields',
        type: 'boolean',
        default: true,
      })
      .option('decorators', {
        description: 'Enable/disable transformation using decorators',
        type: 'boolean',
        default: true,
      })
      .option('classic-decorator', {
        description:
          'Enable/disable adding the @classic decorator, which helps with transitioning Ember Octane',
        type: 'boolean',
        default: true,
      })
      .option('type', {
        description:
          'Apply transformation to only passed type. The type can be one of services, routes, components, controllers',
        type: 'string',
        default: '',
      })
      .option('quote', {
        description:
          'Whether to use double or single quotes by default for new statements that are added during the codemod.',
        type: 'string',
        default: 'single',
      });
  }
).argv;

(async () => {
  await gatherTelemetryForUrl(argv.url, analyzeEmberObject);

  require('codemod-cli').runTransform(__dirname, 'ember-object', argv._ /* paths or globs */);
})();
