
var enabled = false,
    prefix  = function () {};

module.exports = function (str) {
  return enabled && console.log(prefix() + str);
};

module.exports.set = function (en) {
  enabled = en;
};

module.exports.prefix = function (pre) {
  prefix = pre;
};
