# After ES6 classes migration

The purpose of this document is to provide a quick syntax reference to usage of ES6 classes to avoid some common mistakes.

**Note** Any new code can be restricted to use only ES6 classes with the help of [eslint plugin](https://github.com/scalvert/eslint-plugin-ember-es6-class) after the [codemods](https://github.com/scalvert/ember-es6-class-codemod) are run.

# Classes

### Before
```
let MyComponent = Component.extend({

});
```
### After
```
class MyComponent extends Component {

}
```
## Default export
### Before
```
export default Component.extend({

});
```
### After
```
export default class MyComponent extends Component {

}
```
**Note:** It is recommended to have class name for default export, though its not mandatory.

## Mixins
### Before
```
let MyComponent = Component.extend(AMixin, BMixin, {

});
```
### After
```
class MyComponent extends Component.extend(AMixin, BMixin) {

}
```

# Properties

### Before
```
let someVal = "value";

let MyComponent = Component.extend({
  prop: "defaultValue",
  boolProp: true,
  numProp: 123,
  [MY_VAL]: "val",
  queryParams: {},
  someVal
});
```
### After
```
let someVal = "value";

class MyComponent extends Component {
  prop = "defaultValue";
  boolProp = true;
  numProp = 123;
  [MY_VAL] = "val";
  queryParams = {};
  someVal = someVal;
}
```
**Note** The property shorthand does not work in classes as in objects. A class property should be assigned a value otherwise it's value `undefined`. See class property `someVal` in above example.

# Methods

### Before
```
let someFunction = () => {};

let MyComponent = Component.extend({
  someUtilFunction() {
    this._super(...arguments);
    return value;
  },

  someFunction,

  _someOtherFunction() {
    return value;
  }
});
```
### After
```
let someFunction = () => {};

class MyComponent extends Component {
  someUtilFunction() {
    super.someUtilFunction(...arguments);
    return value;
  }

  someFunction = someFunction;

  _someOtherFunction() {
    return value;
  }
}
```
**Note** The `someUtilFunction` must be present in super class hierarchy. An error will be thrown otherwise at run time

# Actions

### Before
```
let someAction = () => {};

let MyComponent = Component.extend({
  actions: {
    onButtonClick() {
      this._super(...arguments);
      return value;
    },

    someAction,
  }
});
```
### After
```
let someAction = () => {};

class MyComponent extends Component {
  @action
  onButtonClick() {
    super.actions.onButtonClick.call(this, ...arguments);
    return value;
  },

  @action
  someAction() {
    someAction.call(this, ...arguments);
  }
}
```
**Notes**
1. The `super` calls in actions are tricky. The `actions` are part of the actions hash on ember objects. So they can be referenced through `super.actions` object. We need to use `call` method to make sure they are bound to correct `this`.

2. Property shorthand does not work correctly in actions. So we have to wrap it inside function. See the action `someAction` in the above example.

3. Make sure that the `onButtonClick` is present in `actions` hash in super class hierarchy. An error will be thrown otherwise at run time

# Decorators
Usage of decorators is well documented in [ember decorators](http://ember-decorators.github.io/ember-decorators/)