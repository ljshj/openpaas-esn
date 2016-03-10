'use strict';

angular.module('esn.profile', ['esn.http', 'openpaas-logo', 'esn.user', 'esn.session'])
  .config(function(dynamicDirectiveServiceProvider) {
    var profile = new dynamicDirectiveServiceProvider.DynamicDirective(true, 'application-menu-profile', {priority: 20});
    dynamicDirectiveServiceProvider.addInjection('esn-application-menu', profile);
  })
  .directive('profileDisplay', function(session) {
    return {
      restrict: 'E',
      scope: {
        user: '='
      },
      templateUrl: '/views/modules/profile/profile.html',
      link: function($scope) {
        $scope.me = session.user._id === $scope.user._id;
      }
    };
  })

  .directive('profileMinicard', function() {
    return {
      restrict: 'E',
      scope: {
        user: '=',
        label: '@',
        labelclass: '@'
      },
      templateUrl: '/views/modules/profile/minicard.html'
    };
  })

  .directive('userProfileLink', function() {
    return {
      restrict: 'E',
      scope: {
        user: '='
      },
      templateUrl: '/views/modules/profile/user-profile-link.html',
      link: function($scope) {
        if (!$scope.user) {
          $scope.name = '';
        } else {
          if ($scope.user.firstname || $scope.user.lastname) {
            $scope.name = ($scope.user.firstname || '') + ' ' + ($scope.user.lastname || '');
          } else {
            $scope.name = $scope.user.emails[0];
          }
        }
      }
    };
  })

  .controller('profileEditionController', function($scope, profileAPI) {
    var maxNameLength = 100;

    $scope.running = {
      name: false,
      job: false,
      service: false,
      building_location: false,
      office_location: false,
      phone: false
    };

    $scope.initFullName = function(firstname, lastname) {
      if (firstname && lastname) {
        $scope.fullName = firstname + ' ' + lastname;
      }
      return $scope.fullName;
    };

    var updateField = function(data, runningMarker, fieldName) {
      $scope.running[runningMarker] = true;

      return profileAPI.updateProfileField(fieldName, data).then(
        function(data) {
          $scope.running[runningMarker] = false;
          return true;
        },
        function(error) {
          $scope.running[runningMarker] = false;
          return error.statusText;
        }
      ).finally(function() {
        $scope.running[runningMarker] = false;
      });
    };

    $scope.updateName = function(data) {
      var nameParts = data.split(' ');
      if (nameParts.length < 2) {
        return 'Incorrect Name';
      }
      var firstName = nameParts.shift();
      var lastName = nameParts.join(' ');
      if (firstName.length > maxNameLength) {
        return 'First name is too long';
      }
      if (lastName.length > maxNameLength) {
        return 'Last name is too long';
      }

      $scope.running.name = true;
      return profileAPI.updateProfileField('firstname', firstName).then(
        function(data) {
          $scope.running.name = false;
          return updateField(lastName, $scope.running.name, 'lastname');
        },
        function(error) {
          $scope.running.name = false;
          return error.statusText;
        }
      ).finally(function() {
        $scope.$emit('username:updated');
      });
    };

    $scope.updateJob = function(data) {
      return updateField(data, 'job', 'job_title');
    };

    $scope.updateService = function(data) {
      return updateField(data, 'service', 'service');
    };

    $scope.updateBuildingLocation = function(data) {
      return updateField(data, 'building_location', 'building_location');
    };

    $scope.updateOfficeLocation = function(data) {
      return updateField(data, 'office_location', 'office_location');
    };

    $scope.updatePhone = function(data) {
      return updateField(data, 'phone', 'main_phone');
    };

  })

  .factory('profileAPI', function(esnRestangular) {
    function updateProfileField(fieldName, fieldValue) {
      var payload = {
        value: fieldValue
      };
      return esnRestangular.one('user/profile', fieldName).customPUT(payload);
    }

    return {
      updateProfileField: updateProfileField
    };
  })

  .controller('profileViewController', function($scope, session, user) {
    $scope.user = user;
  })

  .controller('avatarController', function($rootScope, $scope, $timeout) {

    $scope.getURL = function() {
      if ($scope.user) {
        return '/api/users/' + $scope.user._id + '/profile/avatar?cb=' + Date.now();
      }
      return '/api/user/profile/avatar?cb=' + Date.now();
    };

    $scope.avatarURL = $scope.getURL();
    $rootScope.$on('avatar:updated', function() {
      $timeout(function() {
        $scope.avatarURL = $scope.getURL();
        $scope.$apply();
      });
    });
  })
  .directive('userNameDisplay', function($rootScope, $log, session, userAPI) {
    return {
      restrict: 'E',
      replace: true,
      template: '<span>{{userName}}</span>',
      link: function($scope) {

        function setUserName(user) {
          if (!user) {
            return;
          }
          if (user.firstname || user.lastname) {
            $scope.userName = (user.firstname || '') + ' ' + (user.lastname || '');
          } else {
            $scope.userName = user.emails[0];
          }
        }

        setUserName(session.user);

        $rootScope.$on('username:updated', function() {
          userAPI.currentUser().then(function(response) {
            setUserName(response.data);
          }, function() {
            $log.debug('Can not update the user name');
          });
        });
      }
    };
  })
  .directive('applicationMenuProfile', function(applicationMenuTemplateBuilder) {
    return {
      retrict: 'E',
      replace: true,
      template: applicationMenuTemplateBuilder('/#/profile', 'mdi-account', 'Profile', 'core.application-menu.profile')
    };
  });
