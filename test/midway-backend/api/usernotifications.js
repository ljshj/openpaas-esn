'use strict';

var request = require('supertest'),
  expect = require('chai').expect,
  async = require('async');

describe('The user notification API', function() {

  var app;
  var testuser;
  var testuser1;
  var domain;
  var community;
  var password = 'secret';
  var email = 'foo@bar.com';
  var email1 = 'test1@bar.com';

  var UserNotification;

  function saveNotification(target, read, cb) {
    var notification = new UserNotification({
      subject: {
        id: community._id,
        objectType: 'community'
      },
      verb: {
        label: 'created',
        text: 'created'
      },
      complement: {
        id: 456,
        objectType: 'community'
      },
      category: 'A category',
      read: read
    });

    if (target) {
      notification.target = [{objectType: 'user', id: target._id}];
    }
    notification.save(cb);
  }

  beforeEach(function(done) {
    var self = this;
    this.testEnv.initCore(function() {
      app = require(self.testEnv.basePath + '/backend/webserver/application');
      self.mongoose = require('mongoose');
      var User = require(self.testEnv.basePath + '/backend/core/db/mongo/models/user');
      var Domain = require(self.testEnv.basePath + '/backend/core/db/mongo/models/domain');
      UserNotification = require(self.testEnv.basePath + '/backend/core/db/mongo/models/usernotification');

      testuser = new User({
        username: 'Foo',
        password: password,
        emails: [email]
      });

      testuser1 = new User({
        username: 'TestUser1',
        password: password,
        emails: [email1]
      });

      domain = new Domain({
        name: 'MyDomain',
        company_name: 'MyAwesomeCompany'
      });

      function saveUser(user, cb) {
        user.save(function(err, saved) {
          if (saved) {
            user._id = saved._id;
          }
          return cb(err, saved);
        });
      }

      function saveDomain(domain, user, cb) {
        domain.administrator = user;
        domain.save(function(err, saved) {
          domain._id = saved._id;
          return cb(err, saved);
        });
      }

      async.series([
          function(callback) {
            saveUser(testuser, callback);
          },
          function(callback) {
            saveUser(testuser1, callback);
          },
          function(callback) {
            saveDomain(domain, testuser, callback);
          },
          function(callback) {
            self.helpers.api.createCommunity('community1', testuser, domain, function(err, saved) {
              if (err) {
                return callback(err);
              }
              community = saved;
              callback(null, community);
            });
          }
        ],
        function(err) {
          return done(err);
        });
    });
  });

  afterEach(function(done) {
    this.mongoose.connection.db.dropDatabase();
    this.mongoose.disconnect(done);
  });

  it('should get HTTP 401 when not authenticated', function(done) {
    request(app)
      .get('/api/user/notifications')
      .expect(401)
      .end(done);
  });

  it('should get HTTP 200 with empty array when no notifications are available', function(done) {

    var self = this;
    async.series([
        function(callback) {
          saveNotification(testuser, false, callback);
        }
      ],
      function(err) {
        if (err) {
          return done(err);
        }

        self.helpers.api.loginAsUser(app, testuser1.emails[0], password, function(err, requestAsMember) {
          if (err) {
            return done(err);
          }
          var req = requestAsMember(request(app).get('/api/user/notifications'));
          req.expect(200);
          req.end(function(err, res) {
            expect(err).to.not.exist;
            expect(res.body).to.exist;
            expect(res.body).to.be.an.array;
            expect(res.body.length).to.equal(0);
            expect(res.headers['x-esn-items-count']).to.equal('0');
            done();
          });
        });
      });
  });

  it('should get HTTP 200 with current user notifications', function(done) {

    var self = this;
    async.series([
        function(callback) {
          saveNotification(testuser1, false, callback);
        },
        function(callback) {
          saveNotification(testuser1, false, callback);
        },
        function(callback) {
          saveNotification(testuser, false, callback);
        }
      ],
      function(err) {
        if (err) {
          return done(err);
        }

        self.helpers.api.loginAsUser(app, testuser1.emails[0], password, function(err, requestAsMember) {
          if (err) {
            return done(err);
          }
          var req = requestAsMember(request(app).get('/api/user/notifications'));
          req.expect(200);
          req.end(function(err, res) {
            expect(err).to.not.exist;
            expect(res.body).to.exist;
            expect(res.body).to.be.an.array;
            expect(res.body.length).to.equal(2);
            expect(res.headers['x-esn-items-count']).to.equal('2');
            done();
          });
        });
      });
  });

  it('should get HTTP 200 with unread user notifications', function(done) {

    var self = this;
    async.series([
        function(callback) {
          saveNotification(testuser1, true, callback);
        },
        function(callback) {
          saveNotification(testuser1, true, callback);
        },
        function(callback) {
          saveNotification(testuser1, false, callback);
        }
      ],
      function(err) {
        if (err) {
          return done(err);
        }

        self.helpers.api.loginAsUser(app, testuser1.emails[0], password, function(err, requestAsMember) {
          if (err) {
            return done(err);
          }
          var req = requestAsMember(request(app).get('/api/user/notifications'));
          req.query({read: 'false'});
          req.expect(200);
          req.end(function(err, res) {
            expect(err).to.not.exist;
            expect(res.body).to.exist;
            expect(res.body).to.be.an.array;
            expect(res.body.length).to.equal(1);
            expect(res.headers['x-esn-items-count']).to.equal('1');
            done();
          });
        });
      });
  });

  it('should get HTTP 200 with read user notifications', function(done) {

    var self = this;
    async.series([
        function(callback) {
          saveNotification(testuser1, true, callback);
        },
        function(callback) {
          saveNotification(testuser1, true, callback);
        },
        function(callback) {
          saveNotification(testuser1, false, callback);
        }
      ],
      function(err) {
        if (err) {
          return done(err);
        }

        self.helpers.api.loginAsUser(app, testuser1.emails[0], password, function(err, requestAsMember) {
          if (err) {
            return done(err);
          }
          var req = requestAsMember(request(app).get('/api/user/notifications'));
          req.query({read: 'true'});
          req.expect(200);
          req.end(function(err, res) {
            expect(err).to.not.exist;
            expect(res.body).to.exist;
            expect(res.body).to.be.an.array;
            expect(res.body.length).to.equal(2);
            expect(res.headers['x-esn-items-count']).to.equal('2');
            done();
          });
        });
      });
  });


  it('should get HTTP 200 with defined limit/offset user notifications', function(done) {

    var self = this;
    async.series([
        function(callback) {
          saveNotification(testuser1, false, callback);
        },
        function(callback) {
          saveNotification(testuser1, false, callback);
        },
        function(callback) {
          saveNotification(testuser1, false, callback);
        },
        function(callback) {
          saveNotification(testuser1, false, callback);
        },
        function(callback) {
          saveNotification(testuser1, false, callback);
        }
      ],
      function(err) {
        if (err) {
          return done(err);
        }

        self.helpers.api.loginAsUser(app, testuser1.emails[0], password, function(err, requestAsMember) {
          if (err) {
            return done(err);
          }
          var req = requestAsMember(request(app).get('/api/user/notifications'));
          req.query({read: 'false', limit: 2, offset: 2});
          req.expect(200);
          req.end(function(err, res) {
            expect(err).to.not.exist;
            expect(res.body).to.exist;
            expect(res.body).to.be.an.array;
            expect(res.body.length).to.equal(2);
            expect(res.headers['x-esn-items-count']).to.equal('5');
            done();
          });
        });
      });
  });
});