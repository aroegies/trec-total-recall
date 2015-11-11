var trecapp = angular.module('trecapp', ['ngRoute', 'trecappctrl', 'trecfactory']);

trecapp.config(['$routeProvider',
  function($routeProvider){
    $routeProvider.when('/batch/:topid',{
      templateUrl: 'partials/batch.html',
      controller: 'BatchCtrl'
    }).
    when('/doc', {
      templateUrl: 'partials/api-doc.html',
    }).
    when('/topics',{
      templateUrl: 'partials/nav.html',
      controller: 'NavCtrl'
    }).
    when('/intro',{
      templateUrl: 'partials/intro.html'
    }).
    when('/list',{
      templateUrl: 'partials/list.html'
    }).
    when('/search/:corpid/:topid',{
      templateUrl: 'partials/search.html',
      controller: 'SearchCtrl'
    }).
    when('/results',{
      templateUrl: 'partials/results.html',
      controller: 'ResultsCtrl'
    }).
    when('/runs',{
      templateUrl: 'partials/runs.html',
      controller: 'RunsCtrl'
    }).
    when('/pretty/:runid',{
      templateUrl: 'partials/pretty.html',
      controller: 'PrettyCtrl'
    }).
    otherwise({
      redirectTo: '/intro'
    });
}]);
