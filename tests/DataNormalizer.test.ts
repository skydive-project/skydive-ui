import { TableDataNormalizer } from '../src/TableDataNormalizer'

var assert = require('assert');
describe('DataNormalizer', function () {
  describe('#normalize()', function () {
    it('should have flatten the data', function () {
      var data = [
        {
          "ID": 255,
          "Src": "172.17.0.1"
        },
        {
          "ID": 455,
          "Mask": "255.255.0.0"
        }
      ]

      var columns = ['ID', 'Src', 'Mask']
      var rows = [
        [255, "172.17.0.1", ""],
        [455, "", "255.255.0.0"]
      ]

      var dn = new TableDataNormalizer()
      var normalized = dn.normalize(data)

      assert.deepEqual(normalized.columns, columns)
      assert.deepEqual(normalized.rows, rows)
    });
  });
});