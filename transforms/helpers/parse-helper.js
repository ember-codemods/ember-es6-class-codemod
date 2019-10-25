const path = require('path');
const camelCase = require('camelcase');
const { getTelemetryFor } = require('ember-codemods-telemetry-helpers');
const { capitalizeFirstLetter, get, startsWithUpperCaseLetter } = require('./util');
const { hasValidProps, isFileOfType, isTestFile } = require('./validation-helper');
const { createClass, withComments } = require('./transform-helper');
const { createDecoratorImportDeclarations, getImportedDecoratedProps } = require('./import-helper');
const EOProp = require('./EOProp');
const logger = require('./log-helper');

/**
 * Return the map of instance props and functions from Ember Object
 *
 * For example
 * const myObj = EmberObject.extend({ key: value });
 * will be parsed as:
 * {
 *   instanceProps: [ Property({key: value}) ]
 *  }
 * @param {Object} j - jscodeshift lib reference
 * @param {ObjectExpression} emberObjectExpression
 * @returns {Object} Object of instance and function properties
 */
function getEmberObjectProps(j, eoExpression, importedDecoratedProps = {}, runtimeData = {}) {
  const objProps = get(eoExpression, 'properties') || [];

  return {
    instanceProps: objProps.map(
      objProp => new EOProp(objProp, runtimeData, importedDecoratedProps)
    ),
  };
}

/**
 * Get the map of decorators to import other than the computed props, services etc
 * which already have imports in the code
 *
 * @param {EOProp[]} instanceProps
 * @param {Object} decoratorsMap
 */
function getDecoratorsToImportMap(instanceProps, decoratorsMap = {}) {
  return instanceProps.reduce((specs, prop) => {
    return {
      action: specs.action || prop.isActions,
      classNames: specs.classNames || prop.isClassNames,
      classNameBindings: specs.classNameBindings || prop.isClassNameBindings,
      attributeBindings: specs.attributeBindings || prop.isAttributeBindings,
      layout: specs.layout || prop.isLayoutDecorator,
      templateLayout: specs.templateLayout || prop.isTemplateLayoutDecorator,
      off: specs.off || prop.hasOffDecorator,
      tagName: specs.tagName || prop.isTagName,
      unobserves: specs.unobserves || prop.hasUnobservesDecorator,
    };
  }, decoratorsMap);
}

/**
 * Find the `EmberObject.extend` statements
 *
 * @param {Object} j - jscodeshift lib reference
 * @param {File} root
 * @returns {CallExpression[]}
 */
function getEmberObjectCallExpressions(j, root) {
  return root
    .find(j.CallExpression, { callee: { property: { name: 'extend' } } })
    .filter(
      eoCallExpression =>
        startsWithUpperCaseLetter(get(eoCallExpression, 'value.callee.object.name')) &&
        get(eoCallExpression, 'parentPath.value.type') !== 'ClassDeclaration'
    );
}

/**
 * Returns the variable name
 *
 * @param {VariableDeclaration} varDeclaration
 * @returns {String}
 */
function getVariableName(varDeclaration) {
  return get(varDeclaration, 'value.declarations.0.id.name');
}

/**
 * Return closest parent var declaration statement
 *
 * @param {Object} j - jscodeshift lib reference
 * @param {CallExpression} eoCallExpression
 * @returns {VariableDeclaration}
 */
function getClosestVariableDeclaration(j, eoCallExpression) {
  const varDeclarations = j(eoCallExpression).closest(j.VariableDeclaration);
  return varDeclarations.length > 0 ? varDeclarations.get() : null;
}

/**
 * Get the expression to replace
 *
 * It returns either VariableDeclaration or the CallExpression depending on how the object is created
 *
 * @param {Object} j - jscodeshift lib reference
 * @param {CallExpression} eoCallExpression
 * @returns {CallExpression|VariableDeclaration}
 */
function getExpressionToReplace(j, eoCallExpression) {
  const varDeclaration = getClosestVariableDeclaration(j, eoCallExpression);
  const isFollowedByCreate = get(eoCallExpression, 'parentPath.value.property.name') === 'create';

  let expressionToReplace = eoCallExpression;
  if (varDeclaration && !isFollowedByCreate) {
    expressionToReplace = varDeclaration;
  }
  return expressionToReplace;
}

/**
 * Returns name of class to be created
 *
 * @param {Object} j - jscodeshift lib reference
 * @param {String} classVariableName
 * @param {String} filePath
 * @return {String}
 */
function getClassName(j, eoCallExpression, filePath, type = '') {
  const varDeclaration = getClosestVariableDeclaration(j, eoCallExpression);
  const classVariableName = getVariableName(varDeclaration);

  if (classVariableName) {
    return classVariableName;
  }

  let className = capitalizeFirstLetter(camelCase(path.basename(filePath, 'js')));
  const capitalizedType = capitalizeFirstLetter(type);

  if (capitalizedType === className) {
    className = capitalizeFirstLetter(camelCase(path.basename(path.dirname(filePath))));
  }

  if (!['Component', 'Helper', 'EmberObject'].includes(type) && !className.endsWith(type)) {
    className = `${className}${capitalizedType}`;
  }

  return className;
}

/**
 * Parse ember object call expression, returns EmberObjectExpression and list of mixins
 *
 * @param {CallExpression} eoCallExpression
 * @returns {Object}
 */
function parseEmberObjectCallExpression(eoCallExpression) {
  const callExpressionArgs = get(eoCallExpression, 'value.arguments') || [];
  const props = {
    eoExpression: null,
    mixins: [],
  };
  callExpressionArgs.forEach(callExpressionArg => {
    if (callExpressionArg.type === 'ObjectExpression') {
      props.eoExpression = callExpressionArg;
    } else {
      props.mixins.push(callExpressionArg);
    }
  });
  return props;
}

/**
 * Main entry point for parsing and replacing ember objects
 *
 * @param {Object} j - jscodeshift lib reference
 * @param {File} root
 * @param {String} filePath
 * @param {Object} options
 */
function replaceEmberObjectExpressions(j, root, filePath, options = {}) {
  options.runtimeData = getTelemetryFor(path.resolve(filePath));

  if (!options.runtimeData) {
    logger.warn(`[${filePath}]: SKIPPED Could not find runtime data NO_RUNTIME_DATA`);
    return;
  }

  if (isTestFile(filePath)) {
    logger.warn(`[${filePath}]: Skipping test file`);
    return;
  }

  if (options.type && !isFileOfType(filePath, options.type)) {
    logger.warn(
      `[${filePath}]: FAILURE Type mismatch, expected type '${options.type}' did not match type of file`
    );
    return;
  }
  // Parse the import statements
  const importedDecoratedProps = getImportedDecoratedProps(j, root);
  let transformed = false;
  let decoratorsToImportMap = {};

  getEmberObjectCallExpressions(j, root).forEach(eoCallExpression => {
    const { eoExpression, mixins } = parseEmberObjectCallExpression(eoCallExpression);

    const eoProps = getEmberObjectProps(
      j,
      eoExpression,
      importedDecoratedProps,
      options.runtimeData
    );

    const errors = hasValidProps(j, eoProps, options);

    if (get(eoCallExpression, 'parentPath.value.type') === 'MemberExpression') {
      errors.push('class has chained definition (e.g. EmberObject.extend().reopenClass();');
    }

    if (errors.length) {
      logger.warn(`[${filePath}]: FAILURE \nValidation errors: \n\t${errors.join('\n\t')}`);
      return;
    }

    let className = getClassName(j, eoCallExpression, filePath, get(options, 'runtimeData.type'));

    const superClassName = get(eoCallExpression, 'value.callee.object.name');

    if (className === superClassName) {
      className = `_${className}`;
    }

    const es6ClassDeclaration = createClass(j, className, eoProps, superClassName, mixins, options);

    const expressionToReplace = getExpressionToReplace(j, eoCallExpression);
    j(expressionToReplace).replaceWith(
      withComments(es6ClassDeclaration, expressionToReplace.value)
    );

    transformed = true;

    decoratorsToImportMap = getDecoratorsToImportMap(eoProps.instanceProps, decoratorsToImportMap);
  });

  // Need to find another way, as there might be a case where
  // one object from a file is transformed and other is not
  if (transformed) {
    const decoratorsToImport = Object.keys(decoratorsToImportMap).filter(
      key => decoratorsToImportMap[key]
    );
    createDecoratorImportDeclarations(j, root, decoratorsToImport, options);
    logger.info(`[${filePath}]: SUCCESS`);
  }
  return transformed;
}

module.exports = {
  getClassName,
  getClosestVariableDeclaration,
  getEmberObjectCallExpressions,
  getEmberObjectProps,
  getExpressionToReplace,
  getVariableName,
  replaceEmberObjectExpressions,
};
