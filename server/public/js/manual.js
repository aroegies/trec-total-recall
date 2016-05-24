var trecapp = angular.module('trmanual', []);

trecapp.controller('ManualCtrl', ['$scope', '$http', 
  function($scope,$http){
    $scope.seltopic = undefined;
    $scope.selrun = undefined;
    $scope.validated = false;
    $scope.topics = {};
    $scope.modes = {};
    $scope.gid = "";
    $scope.runs = [];
    $scope.selmode = undefined;
    $scope.selshot = undefined;
    $scope.shots = undefined;
    $scope.validate = function(){
      $http.get('/validate/'+$scope.gid).success(function(data){
        $scope.validated = true;
        $http.get('/modes/'+$scope.gid).success(function(resp){
          $scope.modes = resp;
        });
      });
    };
    $scope.changeMode = function (val){
      $http.get('/crawl/runs/'+$scope.gid+'/'+val+'/manual').success(function(resp){
        $scope.runs = resp;
        $http.get('/topic/group/'+$scope.gid+'/'+val).success(function(resp){
          $scope.topics = resp;
          $scope.seltopic = undefined;
          $scope.selrun = undefined;
        });
      });
    };
    $scope.newrun = function(){
      $http.get('/start/manual/'+$scope.gid+'/'+$scope.selmode+'/'+$scope.newalias).success(function(resp){
        $scope.runs.push(resp);
        $scope.newalias = "";
      });
    };
    $scope.finalizeRun = function(){
      $scope.selrun.finalized = 1;
      $http.get('/finalize/'+$scope.selrun.runid).error(function(){
        alert('Run not finalized');
      })
    }
    $scope.changeShots = function(){
      $http.get('/unshots/'+$scope.selrun.runid+'/'+$scope.seltopic.topid).success(function(resp){
        console.log(resp)
        $scope.shots = resp;
      });
    }
    $scope.callshot = function(){
      $http.post('/judge/shot/'+$scope.selrun.runid+'/'+$scope.seltopic.topid+'/'+$scope.selshot.type).success(function(){
        alert('Shot called');
        $scope.changeShots();
      })
    }
    $scope.formatFinalized = function(val){
      if(val === 0){
        return "Unfinished";
      }else{
        return "Finished";
      }
    }
}]);
