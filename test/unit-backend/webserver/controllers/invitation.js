'use strict';

var mockery = require('mockery');
var expect = require('chai').expect;

describe('the invitation controller', function() {
  beforeEach(function() {
    this.mongoose = this.helpers.requireFixture('mongoose').mongoose();
    mockery.registerMock('mongoose', this.mongoose);

    this.handlerMock = {
      isStillValid: function() {}
    };
    this.helpersMock = {
      config: {
        getBaseUrl: function(user, callback) {
          callback(null, 'http://localhost:8080');
        }
      }
    };
    mockery.registerMock('../../helpers', this.helpersMock);
    mockery.registerMock('../../core/invitation', this.handlerMock);
  });

  describe('load method', function() {

    it('should call Invitation.loadFromUUID', function(done) {
      var invitationId = 'BADA55';
      this.mongoose.model = function(name) {
        expect(name).to.equal('Invitation');
        return {
          loadFromUUID: function(id, callback) {
            expect(id).to.equal(invitationId);
            expect(callback).to.be.a.function;
            done();
          }
        };
      };

      var middleware = this.helpers.requireBackend('webserver/controllers/invitation');
      middleware.load({
          params: {
            uuid: invitationId
          }
        },
        {},
        function() {}
      );
    });

    it('should call next(err) in case of an error', function(done) {
      var invitationId = 'BADA55';
      var err = new Error('server error');
      this.mongoose.model = function(name) {
        expect(name).to.equal('Invitation');
        return {
          loadFromUUID: function(id, callback) {
            callback(err);
          }
        };
      };

      var middleware = this.helpers.requireBackend('webserver/controllers/invitation');
      middleware.load(
        {params: {uuid: invitationId }},
        {},
        function(error) {
          expect(error).to.equal(err);
          done();
        }
      );
    });

    it('should send 404 if there is no response', function(done) {
      var invitationId = 'BADA55';
      this.mongoose.model = function(name) {
        expect(name).to.equal('Invitation');
        return {
          loadFromUUID: function(id, callback) {
            callback();
          }
        };
      };

      var middleware = this.helpers.requireBackend('webserver/controllers/invitation');
      middleware.load(
        {params: {uuid: invitationId }},
        this.helpers.express.response(
          function(code) {
            expect(code).to.equal(404);
            done();
          }
        ),
        function() {}
      );
    });

    it('should call handler.isStillValid if there is an invitation', function(done) {
      var invitationId = 'BADA55';
      this.mongoose.model = function(name) {
        expect(name).to.equal('Invitation');
        return {
          loadFromUUID: function(id, callback) {
            callback(null, {id: invitationId});
          }
        };
      };

      this.handlerMock.isStillValid = function(invitation, callback) {
        expect(invitation).to.deep.equal({id: invitationId});
        expect(callback).to.be.a.function;
        done();
      };
      var middleware = this.helpers.requireBackend('webserver/controllers/invitation');
      middleware.load(
        {params: {uuid: invitationId }},
        {},
        function() {}
      );
    });

    describe('isStillValid callback', function() {
      beforeEach(function() {
        var self = this;
        this.invitationId = 'BADA55';
        this.mongoose.model = function(name) {
          return {
            loadFromUUID: function(id, callback) {
              callback(null, {id: self.invitationId});
            }
          };
        };

        this.handlerMock.isStillValid = function(invitation, callback) {
          self.callback = callback;
        };
      });

      it('should return a 500 error if it receive an error', function(done) {
        var middleware = this.helpers.requireBackend('webserver/controllers/invitation');
        var err = new Error('it breaks');
        middleware.load(
          {params: {uuid: this.invitationId }},
          this.helpers.express.jsonResponse(function(code, data) {
            expect(code).to.equal(500);
            expect(data).to.deep.equal({error: 500, message: 'Internal Server Error', details: err});
            done();
          }),
          function() {}
        );
        this.callback(err);
      });

      it('should return a 404 error if the invitation is not valid anymore', function(done) {
        var middleware = this.helpers.requireBackend('webserver/controllers/invitation');
        middleware.load(
          {params: {uuid: this.invitationId }},
          this.helpers.express.jsonResponse(function(code, data) {
            expect(code).to.equal(404);
            expect(data).to.deep.equal({error: 404, message: 'Not found', details: 'Invitation expired'});
            done();
          }),
          function() {}
        );
        this.callback(null, false);
      });

      it('should set req.invitation and call next() is the invitation is still valid', function(done) {
        var middleware = this.helpers.requireBackend('webserver/controllers/invitation');
        var req = { params: { uuid: this.invitationId } };
        var invitationId = this.invitationId;
        middleware.load(
          req,
          {},
          function(arg) {
            expect(arg).to.be.undefined;
            expect(req.invitation).to.exist;
            expect(req.invitation).to.deep.equal({id: invitationId});
            done();
          }
        );
        this.callback(null, true);
      });
    });
  });

  describe('The getInvitationURL fn', function() {
    var reqMock, invitationMock;

    beforeEach(function() {
      reqMock = {
        user: {
          _id: '123',
          firstname: 'name'
        }
      };

      invitationMock = { uuid: 'BADA55'};

    });

    it('should reject if configHelpers cannot get base_url', function(done) {
      this.helpersMock = {
        config: {
          getBaseUrl: function(user, callback) {
            callback(new Error('something error'));
          }
        }
      };

      mockery.registerMock('../../helpers', this.helpersMock);

      var middleware = this.helpers.requireBackend('webserver/controllers/invitation');

      middleware.getInvitationURL(reqMock, invitationMock)
        .catch(function(err) {
          expect(err.message).to.equal('something error');
          done();
        });
    });

    it('should call configHelpers.getBaseUrl to get base_url', function(done) {
      var baseUrl = 'http://localhost:8080';
      var expectedUrl = baseUrl + '/invitation/' + invitationMock.uuid;

      this.helpersMock = {
        config: {
          getBaseUrl: function(user, callback) {
            callback(null, baseUrl);
          }
        }
      };

      mockery.registerMock('../../helpers', this.helpersMock);

      var middleware = this.helpers.requireBackend('webserver/controllers/invitation');

      middleware.getInvitationURL(reqMock, invitationMock)
        .then(function(url) {
          expect(url).to.equal(expectedUrl);
          done();
        });
    });
  });
});
