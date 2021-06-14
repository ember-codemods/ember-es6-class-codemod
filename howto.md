# Ember ES6 - How to run ES6 class codemods

## Overview
The [ES6 native classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes) support is available in Ember starting with 3.4.x via [polyfill](https://github.com/pzuraq/ember-native-class-polyfill) (3.6.x without polyfill). Transitioning to the new ES6 classes syntax would provide better overall developer experience. The [ember ES6 class codemods](https://github.com/ember-codemods/ember-es6-class-codemod) are developed to make this transition easier.

The purpose of this document is to provide step by step guide to install and run codemods on your code base.

## Prerequisites
The application must be running on
- `ember-source@^3.4.6`
- `ember-cli-babel@^7.x.x`

## Dependencies

Before moving on to installation steps, let's take a quick overview of dependencies which will be added to the application.

### [ember-es6-class-codemod](https://github.com/ember-codemods/ember-es6-class-codemod)
Codemods for transforming ember app code to native ES6 class syntax with decorators. The codemods can be installed globally (recommended) or locally.

### [ember-es6-class-codemod-dyfactor](https://github.com/ssutar/ember-es6-class-codemod-dyfactor)
[Dyfactor](https://github.com/dyfactor/dyfactor) is a plugin runner system which allows you to collect the runtime information about the code. The [ember-es6-class-codemod-dyfactor](https://github.com/ssutar/ember-es6-class-codemod-dyfactor) is a dyfactor plugin to extract the runtime data about ember objects. This data need to be passed to the codemods to provide metadata about the objects being transformed.

### [eslint-plugin-ember-es6-class](https://github.com/scalvert/eslint-plugin-ember-es6-class)
Eslint plugin for enforcing usages of Ember ES6 classes in your application. Recommended to enable after transformation to ES6 classes to prevent addition of code in EmberObject.extend syntax.

### [ember-decorators](https://github.com/ember-decorators/ember-decorators)
Ember decorators provide a set of [decorators](https://github.com/tc39/proposal-decorators#decorators) which can be used to write native classes with every standard feature that is available in Ember, along with the transforms and build system required to polyfill

### [ember-native-class-polyfill](https://github.com/pzuraq/ember-native-class-polyfill)
This addon provides a polyfill for the native class behavior that was proposed in Ember RFCs [#240](https://emberjs.github.io/rfcs/0240-es-classes.html) and [#337](https://emberjs.github.io/rfcs/0337-native-class-constructor-update.html).

## Installation
Install [ember-es6-class-codemod](https://github.com/scalvert/ember-es6-class-codemod) globally
```
yarn global add ember-es6-class-codemod
```
Install the following dev dependencies in your project:
- [eslint rule](https://github.com/scalvert/eslint-plugin-ember-es6-class) and
- [dyfactor plugin](https://github.com/ssutar/ember-es6-class-codemod-dyfactor)
```
yarn add eslint-plugin-ember-es6-class ember-es6-class-codemod-dyfactor --dev
```
- Install the [ember decorators](https://github.com/ember-decorators/ember-decorators) in your project:

```
yarn ember install ember-decorators
```
  **Note** Make sure the `@ember-decorators/babel-transforms` version is `^2.1.0` in `package.json`. If not, change it to `^2.1.0` and run `yarn install`

- _Install [ember native class polyfill](https://github.com/pzuraq/ember-native-class-polyfill) only if your application is running on `ember-source` less than v3.6.x_
```
yarn ember install ember-native-class-polyfill
```

## Setup dyfactor plugin
Once all the dependencies are installed successfully, the application need to be setup to run the [dyfactor plugin](https://github.com/ssutar/ember-es6-class-codemod-dyfactor), which is used to gather valuable runtime information from the application for use within the codemod. The codemods are designed with runtime data as input to correctly transform the code. See the documentation of [Runtime Config Path](https://github.com/ember-codemods/ember-es6-class-codemod#runtime-config-path) option for more details.

[Dyfactor](https://github.com/dyfactor/dyfactor) is a plugin runner system, which allows you to collect the runtime information about the code. See the [documentation](https://github.com/dyfactor/dyfactor#usage) for more details about dyfactor


To initialize the dyfactor plugin, run
```
yarn dyfactor init
```
A file `.dyfactor.json` will be created in the current directory.

To view the list of dyfactor plugins installed
```
yarn dyfactor list-plugins

The list of available dyfactor plugins will be displayed, for example:

Plugins
=============
Name: ember-object Type: template Levels: extract, modify
✨  Done in 0.83s.
```

Open `.dyfactor.json` and set the entry in `navigation.pages` list. The page entry must be of the test page url, for example:
```
{
  "navigation": {
    "pages": [
    "http://localhost:4200/tests/index.html?runtimedata"
	]
  }
}
```
**Note** The dyfactor plugin does not need to run all the tests. It is recommended to configure the url using filters or module/test ids such that it would run a small subset of tests or a single test (preferred).

Edit the `test-helper.js` file from the application and add the following code:
```
  // ... Other imports

  import { extract } from "ember-es6-class-codemod-dyfactor/test-support/ember-object";

  // Add this after all the assets are loaded, just before `start`

  if (QUnit.urlParams.runtimedata) {
    extract();
  }

  start();
```
**Note** Make sure to wrap the extract call in some query parameter, and pass in the same query parameter to the configuration url in `.dyfactor.json`

**IMPORTANT** Commit all the changes locally. The dyfactor plugin switches to a new branch and modifies the code. It removes all the uncommitted local changes in the process.

## Collecting runtime data
Start your application
```
ember serve
```
Run the dyfactor plugin using following command:
```
yarn dyfactor run template ember-object <path> --level extract
```
`<path>` can be any directory in the application for which the runtime data need to be extracted.

This command prompts for user input in different stages of execution

The first prompt is
```
? Start your dev server and press enter to continue... (Continue)
```
Make sure your application is running and press enter.

Once you press enter the dyfactor will
- Create a new branch
- Switch to the newly created branch
- Run the dyfactor plugin codemods on your application code

The next prompt will be
```
? Press enter when your dev server is reset... (Continue)
```
Wait till the server is reset after applying the changes made by dyfactor plugin in the application code. Press enter when server is done reset.

A message will be displayed something like:
```
Collecting telemetry data…
```
At this step a new browser window (chromium) is opened with the url configured in the `.dyfactor.json`. The test will be run and the window will be closed automatically.

After this step the runtime data will be collected in the file `dyfactor-telemetry.json`

## Running codemods
Run the transforms [ember-object](https://github.com/scalvert/ember-es6-class-codemod/tree/master/transforms/ember-object)
```
ember-es6-class-codemod ember-object <path-to-run-codemods-on> --decorators=true --runtime-config-path=dyfactor-telemetry.json
```

The codemods can be run targeting a small subset of application code. For example you can target a single in-repo addon or single type (for example services, controllers etc) in the addon. See the [usage details](https://github.com/scalvert/ember-es6-class-codemod#usage) for all the options.

## Configuring ESLint rule

To enable the [ESLint rule](https://github.com/scalvert/eslint-plugin-ember-es6-class) which will disallow usage of the old `EmberObject.extend` syntax -

Add the following code to `.eslintrc.js`

```
module.exports = {
  root: true,
  plugins: ['ember-es6-class'],

  // ... other config ...

  rules: {
    overrides: [{
      files: ['<transformed-addon-path>/**/*.js'],
      rules: {
        'ember-es6-class/no-object-extend': 'error',
  	},
    }]
  }
}
```

## Debugging
Check the `codemods.log` in the directory from where the codemods are being executed.

The codemods execution details are logged into the `codemods.log` file. Specifically, details such as failures and reasons for failures, are logged. This would be the recommended starting point for debugging issues.

## Known errors
- In dyfactor plugin execution, an error might be logged to console
  ```
  Error occurred in instrumenting <some/file/path.js> { TypeError: unknown: Property init of VariableDeclarator expected node to be of a type ["Expression"] but instead got "FunctionDeclaration"
  ```

  This means that the file which the plugin is instrumenting does not have a default export, in other words the file does not need transformation. Please ignore this error

- Codemods might throw below error
  ```
  ERR <path> Transformation error
  <error reason with stack trace>
  ```

  Verify the `<path>` value, in most cases it would be a non js file. While this is [known issue](https://github.com/scalvert/ember-es6-class-codemod/issues/42) in the codemods, it will be fixed soon

- An eslint error might be reported after running codemods.
  ```
  Parsing error: Using the export keyword between a decorator and a class is not allowed. Please use `export @dec class` instead.
  ```
  This happens because your application is running on `babel-eslint` v9 or higher. To fix this issue set the `legacyDecorators` option in the `.eslintrc.js` file as following:
  ```
  module.exports = {
    // ... config options ...
    parserOptions: {
      ecmaFeatures: { legacyDecorators: true },
    },

    // ... more config options ...
  }
  ```

## References
- [jscodeshift](https://github.com/facebook/jscodeshift)
- [Recast](https://github.com/benjamn/recast)
- [ASTExplorer](https://astexplorer.net/)
- [Codemod-cli](https://github.com/rwjblue/codemod-cli)
- [Dyfactor](https://github.com/dyfactor/dyfactor)
- [RFC - Ember native class roadmap](https://github.com/pzuraq/emberjs-rfcs/blob/b47e7f9ec4f02c7d27d50de64691130e7d22747d/text/0000-native-class-roadmap.md)
- [RFC - Ember native class constructor update](https://github.com/pzuraq/emberjs-rfcs/blob/94b38d429eb2964fa86cd13bea6823a01b3ef68d/text/0000-native-class-constructor-update.md)
- [RFC - Ember native classes codemods](https://docs.google.com/document/d/18QW1SJ6crN5Lh2ZhsSJgjx-oxpMZXUhYBSnrBqxKprI/edit#heading=h.hmogsghmufas)
- [ember-es6-class-codemod-dyfactor](https://github.com/ssutar/ember-es6-class-codemod-dyfactor)
