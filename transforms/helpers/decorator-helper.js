const { get } = require("./util");

/**
 * Copy decorators `from` => `to`
 * @param {Object} to
 * @param {Object} decorators
 * @returns {Object}
 */
function withDecorators(to, decorators = []) {
  if (decorators.length > 0) {
    to.decorators = decorators;
  }
  return to;
}

/**
 * Creates a list of class decorators `tagName` and `classNames`
 *
 * @param {Object} j - jscodeshift lib reference
 * @param {Property} classDecoratorProp
 * @returns {Decorator[]}
 */
function createClassDecorator(j, classDecoratorProp) {
  let decoratorArgs = [];
  if (classDecoratorProp.type === "ArrayExpression") {
    decoratorArgs = classDecoratorProp.value.elements;
  } else {
    decoratorArgs = [classDecoratorProp.value];
  }
  return j.decorator(
    j.callExpression(j.identifier(classDecoratorProp.name), [...decoratorArgs])
  );
}

/**
 * Create decorators for computed properties and methods
 * This method handles decorators for `DECORATOR_PROPS` defined in `util.js`
 *
 * @param {Object} j - jscodeshift lib reference
 * @param {String} decoratorName
 * @param {Property} instanceProp
 * @returns {Decorator[]}
 */
function createCallExpressionDecorators(j, decoratorName, instanceProp) {
  const decoratorArgs = instanceProp.hasNonLiteralArg
    ? instanceProp.callExprArgs.slice(0, -1)
    : instanceProp.callExprArgs.slice(0);

  if (instanceProp.isVolatileReadOnly) {
    return [];
  }

  return instanceProp.modifiers.reduce(
    (decorators, modifier) => {
      if (modifier.args.length !== 0) {
        decorators.push(
          j.decorator(j.callExpression(modifier.prop), modifier.args)
        );
      } else {
        decorators.push(j.decorator(modifier.prop));
      }
      return decorators;
    },
    [j.decorator(j.callExpression(j.identifier(decoratorName), decoratorArgs))]
  );
}

/**
 * Create `@action` decorator
 *
 * @param {Object} j - jscodeshift lib reference
 * @returns {Decorator[]}
 */
function createIdentifierDecorators(j, identifier = "action") {
  return [j.decorator(j.identifier(identifier))];
}

/**
 * Create decorators for props from `classNameBindings` and `attributeBindings`
 *
 * @param {Object} j - jscodeshift lib reference
 * @param {String} decoratorName
 * @param {Property[]} instanceProp
 * @returns {Decorator[]}
 */
function createBindingDecorators(j, decoratorName, instanceProp) {
  const propList = get(instanceProp, "propList");
  if (propList && propList.length) {
    const propArgs = propList.map(prop => j.literal(prop));
    return [
      j.decorator(j.callExpression(j.identifier(decoratorName), propArgs))
    ];
  }
  return [j.decorator(j.identifier(decoratorName))];
}

/**
 * Handles decorators for instance properties
 *
 * @param {Object} j - jscodeshift lib reference
 * @param {Property[]} instanceProp
 * @returns {Decorator[]}
 */
function createInstancePropDecorators(j, instanceProp) {
  return instanceProp.decoratorNames.reduce((decorators, decoratorName) => {
    if (!decoratorName) {
      return decorators;
    }
    if (decoratorName === "className" || decoratorName === "attribute") {
      return decorators.concat(
        createBindingDecorators(j, decoratorName, instanceProp)
      );
    }
    if (decoratorName === "off" || decoratorName === "unobserves") {
      return decorators.concat(createIdentifierDecorators(j, decoratorName));
    }
    return decorators.concat(
      createCallExpressionDecorators(j, decoratorName, instanceProp)
    );
  }, []);
}

module.exports = {
  withDecorators,
  createClassDecorator,
  createIdentifierDecorators,
  createCallExpressionDecorators,
  createInstancePropDecorators
};
