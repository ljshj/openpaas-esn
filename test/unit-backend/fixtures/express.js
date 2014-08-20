'use strict';

exports.express = function() {
  function expressMock() {
    return expressMock.constructorResponse;
  }
  expressMock.logger = function() {};
  expressMock.static = function() {};
  expressMock.bodyParser = function() {};
  expressMock.json = function() {};
  expressMock.urlencoded = function() {};
  expressMock.cookieParser = function() {};
  expressMock.session = function() {};
  expressMock.constructorResponse = {
    all: function() {},
    listen: function() {},
    use: function() {},
    set: function() {},
    get: function() {},
    post: function() {},
    put: function() {},
    delete: function() {}
  };

  return expressMock;
};
