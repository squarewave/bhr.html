export class OneToManyIndex {
  constructor(keys) {
    // expectations: keys are monotonically increasing, and are bounded by some
    // "small" number (small enough to make an Int32Array with that length). And
    // values is an array with the same length as keys, where each value corresponds
    // to the key at the same index.
    this._keysToIndices = new Int32Array(keys[keys.length - 1] + 2);

    let lastKey;
    for (let i = 0; i < keys.length; i++) {
        if (lastKey != keys[i]) {
            this._keysToIndices[keys[i]] = i;
            if (keys[i] != lastKey + 1) {
                for (let j = lastKey + 1; j < keys[i]; j++) {
                    this._keysToIndices[j] = i;
                }
            }
            lastKey = keys[i];
        }
    }
    this._keysToIndices[this._keysToIndices.length - 1] = keys.length;
  }

  getRowIndices(keys) {
    let size = keys
        .map(key => this._keysToIndices[key + 1] - this._keysToIndices[key])
        .reduce((a, b) => a + b, 0);
    let index = 0;
    let result = new Int32Array(size);
    for (let key of keys) {
        for (let i = this._keysToIndices[key]; i < this._keysToIndices[key + 1]; i++) {
            result[index++] = i;
        }
    }
    return result;
  }
}