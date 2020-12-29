"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  Recycler: true
};
Object.defineProperty(exports, "Recycler", {
  enumerable: true,
  get: function get() {
    return _recycler["default"];
  }
});

var _recycler = _interopRequireDefault(require("./recycler"));

var _dataSources = require("./data-sources");

Object.keys(_dataSources).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _dataSources[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _dataSources[key];
    }
  });
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }