var trecapp = angular.module('trmanualres', []);

trecapp.controller('ManualResCtrl', ['$scope', '$http','$location', 
  function($scope,$http,$location){
    $scope.results ={};
    var params = $location.search();
    $http.get('/manualresults/' + params.runid).success(function(resp){
      $scope.results = resp;
    }).error(function(resp){alert(resp)});
}]);
