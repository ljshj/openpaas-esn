'use strict';

var expect = require('chai').expect;
var mockery = require('mockery');

describe('The local pubsub for MongoDB configuration', function() {
  var pubsub = null;

  before(function() {
    this.testEnv.writeDBConfigFile();
    pubsub = require(this.testEnv.basePath + '/backend/core').pubsub.local;
  });

  after(function() {
    this.testEnv.removeDBConfigFile();
  });

  it('should fire a publish when mongodb configuration is available', function(done) {

    var mongodb = {
      hostname: 'localhost',
      port: 27017,
      dbname: 'hiveety-test'
    };

    var configuredMock =
      function() {
        var topic = pubsub.topic('mongodb:configurationAvailable');
        topic.publish(mongodb);
        return true;
      };

    mockery.registerMock('../configured', configuredMock);

    var core = require(this.testEnv.basePath + '/backend/core');
    var templates = core.templates;

    var topic = pubsub.topic('mongodb:configurationAvailable');
    topic.subscribe(function(config) {
      expect(config).to.equal(mongodb);
    });

    templates.inject(function() {
      done();
    });
  });
});
