const Immutable = require('immutable');
const assert = require('assert');

/**
 * @param {Immutable.Map|Immutable.List} errors
 */
function transformNestedErrors(errors) {
  return Immutable.Map.isMap(errors) || errors.some(err => typeof err !== 'string')
    ? errors.map(transformNestedErrors)
    : concatUniqueErrors(errors);
}

/**
 * @param {Immutable.List} errors
 */
function concatUniqueErrors(errors) {
  return (
    errors
      .toSet()
      .toList()
      .join('. ') + '.'
  );
}

/**
 * @param {Immutable.Map} errors
 * @param {string[]} preserveNested
 */
function transformErrors(errors, preserveNested = []) {
  return errors.map((value, key) =>
    preserveNested.includes(key) ? transformNestedErrors(value) : concatUniqueErrors(value.flatten())
  );
}

it('should tranform errors', () => {
  // example error object returned from API converted to Immutable.Map
  const errors = Immutable.fromJS({
    name: ['This field is required'],
    age: ['This field is required', 'Only numeric characters are allowed'],
    urls: [
      {},
      {},
      {
        site: {
          code: ['This site code is invalid'],
          id: ['Unsupported id'],
        },
      },
    ],
    url: {
      site: {
        code: ['This site code is invalid'],
        id: ['Unsupported id'],
      },
    },
    tags: [
      {},
      {
        non_field_errors: ['Only alphanumeric characters are allowed'],
        another_error: ['Only alphanumeric characters are allowed'],
        third_error: ['Third error'],
      },
      {},
      {
        non_field_errors: ['Minumum length of 10 characters is required', 'Only alphanumeric characters are allowed'],
      },
    ],
    tag: {
      nested: {
        non_field_errors: ['Only alphanumeric characters are allowed'],
      },
    },
  });

  // in this specific case,
  // errors for `url` and `urls` keys should be nested
  // see expected object below
  const result = transformErrors(errors, ['url', 'urls']);

  assert.deepEqual(result.toJS(), {
    name: 'This field is required.',
    age: 'This field is required. Only numeric characters are allowed.',
    urls: [
      {},
      {},
      {
        site: {
          code: 'This site code is invalid.',
          id: 'Unsupported id.',
        },
      },
    ],
    url: {
      site: {
        code: 'This site code is invalid.',
        id: 'Unsupported id.',
      },
    },
    tags: 'Only alphanumeric characters are allowed. Third error. ' + 'Minumum length of 10 characters is required.',
    tag: 'Only alphanumeric characters are allowed.',
  });
});
