'use strict';

/* global chai: false */

var expect = chai.expect;

describe('The event-date-edition component', function() {
  beforeEach(function() {
    module('jadeTemplates');
    angular.mock.module('esn.fcmoment');
    angular.mock.module('esn.calendar');
  });

  describe('eventDateEdition directive', function() {
    beforeEach(angular.mock.inject(function($rootScope, $compile, FCMoment) {
      this.$rootScope = $rootScope;
      this.$scope = this.$rootScope.$new();
      this.moment = FCMoment;
      this.$compile = $compile;

      this.initDirective = function(scope) {
        var html = '<event-date-edition event="event"></event-date-edition>';
        var element = this.$compile(html)(scope);
        scope.$digest();
        this.eleScope = element.isolateScope();
        return element;
      };
    }));

    it('should compute diff of start date and end date onload', function() {
      this.$scope.event = {
        start: this.moment('2013-02-08 09:30'),
        end: this.moment('2013-02-08 10:30')
      };
      this.initDirective(this.$scope);
      expect(this.$scope.event.diff).to.deep.equal(3600000);
    });

    describe('scope.setEventDates', function() {
      it('should stripTime scope.event.allDay is true', function() {
        this.$scope.event = {
          start: this.moment('2013-02-08 09:30'),
          end: this.moment('2013-02-08 10:30'),
          allDay: true
        };
        this.initDirective(this.$scope);
        this.eleScope.setEventDates();
        expect(this.$scope.event.start.hasTime()).to.be.false;
        expect(this.$scope.event.end.hasTime()).to.be.false;
      });

      it('should set the time of start and end to next hour and set back utc flag to false', function() {
        this.$scope.event = {
          start: this.moment('2013-02-08 09:30').stripTime(),
          end: this.moment('2013-02-09 10:30').stripTime(),
          allDay: false
        };
        this.initDirective(this.$scope);
        this.eleScope.setEventDates();
        var nextHour = this.moment().endOf('hour').add(1, 'seconds');

        expect(this.$scope.event.start.hasTime()).to.be.true;
        expect(this.$scope.event.end.hasTime()).to.be.true;
        expect(this.$scope.event.start._isUTC).to.be.false;
        expect(this.$scope.event.end._isUTC).to.be.false;
        expect(this.$scope.event.start.time().seconds())
          .to.deep.equal(nextHour.time().seconds());
        expect(this.$scope.event.end.time().seconds())
          .to.deep.equal(nextHour.time().seconds());
      });

      it('should set the time of start to next hour and end to next hour+1 if same day', function() {
        this.$scope.event = {
          start: this.moment('2013-02-08 09:30'),
          end: this.moment('2013-02-08 10:30'),
          allDay: false
        };
        this.initDirective(this.$scope);
        this.eleScope.setEventDates();
        var nextHour = this.moment().endOf('hour').add(1, 'seconds');
        expect(this.$scope.event.start.time().seconds())
          .to.deep.equal(nextHour.time().seconds());
        expect(this.$scope.event.end.time().seconds())
          .to.deep.equal(nextHour.add(1, 'hour').time().seconds());
      });
    });

    describe('scope.getMinDate', function() {
      it('should return null if start is undefined', function() {
        this.$scope.event = {};
        this.initDirective(this.$scope);
        expect(this.eleScope.getMinDate()).to.be.null;
      });

      it('should return start minus 1 day', function() {
        this.$scope.event = {
          start: this.moment('2013-02-08 09:30'),
          end: this.moment('2013-02-08 10:30')
        };
        this.initDirective(this.$scope);
        this.$scope.$digest();
        var isSame = this.moment('2013-02-07 09:30').isSame(this.eleScope.getMinDate());
        expect(isSame).to.be.true;
      });
    });

    describe('scope.getMinTime', function() {
      it('should return null if start is undefined', function() {
        this.$scope.event = {};
        this.initDirective(this.$scope);
        expect(this.eleScope.getMinTime()).to.be.null;
      });

      it('should return null if start is not same day than end', function() {
        this.$scope.event = {
          start: this.moment('2013-02-08 09:30'),
          end: this.moment('2013-02-09 10:30')
        };
        this.initDirective(this.$scope);
        expect(this.eleScope.getMinTime()).to.be.null;
      });

      it('should return start', function() {
        this.$scope.event = {
          start: this.moment('2013-02-08 09:30'),
          end: this.moment('2013-02-08 10:30')
        };
        this.initDirective(this.$scope);
        var isSame = this.moment('2013-02-08 09:30').isSame(this.eleScope.getMinTime());
        expect(isSame).to.be.true;
      });
    });

    describe('scope.onStartDateChange', function() {
      it('should set end to start plus the previous stored diff', function() {
        this.$scope.event = {
          start: this.moment('2013-02-08 09:30'),
          end: this.moment('2013-02-08 10:30')
        };
        this.initDirective(this.$scope);
        this.$scope.event.diff = 3600 * 1000 * 2; // 2 hours
        this.eleScope.onStartDateChange();
        var isSame = this.moment('2013-02-08 11:30').isSame(this.$scope.event.end);
        expect(isSame).to.be.true;
      });
    });

    describe('scope.onEndDateChange', function() {
      it('should compute diff between start and end', function() {
        this.$scope.event = {
          start: this.moment('2013-02-08 09:30'),
          end: this.moment('2013-02-08 13:30')
        };
        this.initDirective(this.$scope);
        this.eleScope.onEndDateChange();
        expect(this.$scope.event.diff).to.equal(3600 * 1000 * 4);
      });

      it('should set end to start plus 1 hour if end is before start', function() {
        this.$scope.event = {
          start: this.moment('2013-02-08 09:30'),
          end: this.moment('2013-02-07 13:30')
        };
        this.initDirective(this.$scope);
        this.eleScope.onEndDateChange();
        var isSame = this.moment('2013-02-08 10:30').isSame(this.$scope.event.end);
        expect(isSame).to.be.true;
      });
    });
  });

  describe('The friendlifyEndDate directive', function() {

    beforeEach(inject(['$compile', '$rootScope', 'moment', function($c, $r, moment) {
      this.$compile = $c;
      this.$rootScope = $r;
      this.$scope = this.$rootScope.$new();
      this.moment = moment;

      this.initDirective = function(scope) {
        var html = '<input ng-model="event.end" friendlify-end-date/>';
        var element = this.$compile(html)(scope);
        scope.$digest();
        return element;
      };
    }]));

    it('should have a first formatters that output the date -1 day if event is a allday', function() {
      this.$scope.event = {
        allDay: true,
        end: this.moment('2015-07-03')
      };
      var element = this.initDirective(this.$scope);
      var controller = element.controller('ngModel');
      expect(controller.$viewValue).to.deep.equal('2015/07/02');
    });

    it('should have a first formatters that do nothing if event is not allday', function() {
      this.$scope.event = {
        allDay: false
      };
      var element = this.initDirective(this.$scope);
      var formatter = element.controller('ngModel').$formatters[0];
      expect(formatter('2015/07/03')).to.deep.equal('2015/07/03');
    });

    it('should have a first formatters that do nothing if event is allday and event.start is same day than event.end', function() {
      this.$scope.event = {
        allDay: true,
        start: this.moment('2015-07-03'),
        end: this.moment('2015-07-03')
      };
      var element = this.initDirective(this.$scope);
      var formatter = element.controller('ngModel').$formatters[0];
      expect(formatter('2015/07/03')).to.deep.equal('2015/07/03');
    });

    it('should have a last parsers that add 1 day if event is allday', function() {
      this.$scope.event = {
        allDay: true
      };
      var element = this.initDirective(this.$scope);
      var parser = element.controller('ngModel').$parsers[0];
      expect(parser(this.moment('2015/07/03')).format('YYYY/MM/DD')).to.deep.equal(this.moment('2015/07/04').format('YYYY/MM/DD'));
    });

    it('should have a last parsers that do nothing if event is not allday', function() {
      this.$scope.event = {
        allDay: false
      };
      var element = this.initDirective(this.$scope);
      var parser = element.controller('ngModel').$parsers[0];
      expect(parser(this.moment('2015/07/03')).format('YYYY/MM/DD')).to.deep.equal(this.moment('2015/07/03').format('YYYY/MM/DD'));
    });

    it('should subtract 1 days to end if event is not allday on event-date-edition:allday:changed', function() {
      this.$scope.event = {
        allDay: true,
        start: this.moment('2015-07-03'),
        end: this.moment('2015-07-03')
      };
      this.initDirective(this.$scope);
      this.$rootScope.$broadcast('event-date-edition:allday:changed');
      this.$rootScope.$digest();
      expect(this.$scope.event.end.isSame(this.moment('2015-07-04'), 'day')).to.be.true;
    });

    it('should add 1 days to end if event is allday on event-date-edition:allday:changed', function() {
      this.$scope.event = {
        allDay: false,
        start: this.moment('2015-07-03'),
        end: this.moment('2015-07-03')
      };
      this.initDirective(this.$scope);
      this.$rootScope.$broadcast('event-date-edition:allday:changed');
      this.$rootScope.$digest();
      expect(this.$scope.event.end.isSame(this.moment('2015-07-02'), 'day')).to.be.true;
    });

    it('should add 1 hour to end if event is not allday and start is same than end', function() {
      this.$scope.event = {
        allDay: false,
        start: this.moment('2015-07-03 10:00'),
        end: this.moment('2015-07-04 11:00')
      };
      this.initDirective(this.$scope);
      this.$rootScope.$broadcast('event-date-edition:allday:changed');
      this.$rootScope.$digest();
      var expectedDate = this.moment('2015-07-04 11:00').subtract(1, 'days').add(1, 'hour');
      expect(this.$scope.event.end.isSame(expectedDate)).to.be.true;
    });
  });

  describe('The dateToMoment directive', function() {

    beforeEach(inject(['$compile', '$rootScope', 'moment', function($c, $r, moment) {
      this.$compile = $c;
      this.$rootScope = $r;
      this.$scope = this.$rootScope.$new();
      this.moment = moment;

      this.initDirective = function(scope) {
        var html = '<input ng-model="event.end" date-to-moment/>';
        var element = this.$compile(html)(scope);
        scope.$digest();
        return element;
      };
    }]));

    it('should return a FCMoment Date if event is allday', function() {
      this.$scope.event = {
        allDay: true
      };
      var element = this.initDirective(this.$scope);
      var parser = element.controller('ngModel').$parsers[0];
      expect(parser('2015-07-03 10:30').hasTime()).to.be.false;
    });

    it('should return a FCMoment DateTime if event is not allday', function() {
      this.$scope.event = {
        allDay: false
      };
      var element = this.initDirective(this.$scope);
      var parser = element.controller('ngModel').$parsers[0];
      expect(parser('2015-07-03 10:30').hasTime()).to.be.true;
    });
  });

});