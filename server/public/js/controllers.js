var trecappctrl = angular.module('trecappctrl', []);

trecappctrl.controller('BatchCtrl',['$scope', '$http', '$routeParams', 'Auth',
  function($scope, $http, $routeParams, Auth){
    $scope.topic = $routeParams.topid;
    $scope.runid = Auth.getrid();
    $scope.retdocs = {};
    $scope.submit = function(){
      var req = {
        method : 'POST',
        url: '/judge/' + $scope.runid + '/' + $scope.topic,
        headers: {'Content-Type': 'application/json'},
        data : $scope.docs,
      };
      $http(req).success(function(resp){
        $scope.retdocs = resp;
      });
    };
    $scope.isvalid = function(){
      try{
        JSON.parse($scope.docs);
        return true;
      }catch(e){
        alert("Invalid JSON");
        return false;
      }
    }
}]);

trecappctrl.controller('ResultsCtrl',['$scope','$http', function($scope, $http){
  $scope.results = {};
  $scope.inProgress = false;
  $scope.submit = function(){
    $scope.inProgress = true;
    $http.get("/results/" + $scope.runid).success(function(resp){
      $scope.inProgress = false;
      $scope.results = resp;
    }).error(function(resp){alert(resp)});
  }
}]);
trecappctrl.controller('PrettyCtrl',['$scope','$http','$routeParams', function($scope, $http, $routeParams){
  $scope.results = {};
  $http.get("/results/" + $routeParams.runid).success(function(resp){
    $scope.results = resp;
  }).error(function(resp){alert(resp)});
}]);
trecappctrl.controller('RunsCtrl',['$scope','$http', function($scope, $http){
  $scope.runresults = {};
  $scope.newrun = {};
  $scope.inProgress = false;
  $scope.newrunf = false;
  $scope.runresultsf = false;
  $scope.listRuns = function(){
    $scope.inProgress = true;
    $http.get("/crawl/runs/" + $scope.groupid).success(function(resp){
      $scope.inProgress = false;
      $scope.runresults = resp;
      $scope.newrun = {};
      $scope.newrunf = false;
      $scope.runresultsf = true;
    });
  }
  $scope.newRun = function(){
    $scope.inProgress = true;
    $http.get('/start/'+$scope.groupid+'/EXPLORER').success(function(resp){
      $scope.inProgress = false;
      $scope.newrun = resp;
      $scope.runresults = {};
      $scope.newrunf = true;
      $scope.runresultsf = false;
    });
  };
}]);

trecappctrl.controller('NavCtrl',['$scope', '$http', 'Auth', function($scope, $http, Auth){
  $scope.corpora = {};
  $scope.topics = {};
  $scope.loggedIn = function(){
    return Auth.getrid() != "";
  }
  $http.get("/crawl/corpora/"+Auth.getrid()).success(function(resp){
    $scope.corpora = resp;
  });
  $http.get("/topic/all/"+Auth.getrid()).success(function(resp){
    $scope.topics = resp;
  });
}]);

trecappctrl.controller('AuthCtrl', ['$scope','$http','Auth', function($scope, $http, Auth){
  $scope.rid="";
  $scope.setAuth = function(newgid){
    Auth.setinfo(newgid).then(function(resp){
      $scope.rid = resp;
    },function(err){console.log("Error")});
  };
}]);

trecappctrl.controller('SearchCtrl', ['$scope', '$http', '$sce', '$routeParams', 'Auth', '$location',
  function($scope, $http, $sce, $routeParams, Auth, $location){
    $scope.topid = $routeParams.topid;
    $scope.corpid = $routeParams.corpid;
    $scope.topic = {};
    $scope.docno = 0;
    if($scope.topid != -1){
      $http.get('/topic/need/' + Auth.getrid() + '/' + $scope.topid).success(function(data){
        $scope.topic = data;
        $scope.topic.need = $sce.trustAsHtml($scope.topic.need.replace(/(?:\r\n|\r|\n)/g, '<br />'))
      });
    }else{
      $scope.topic.topid = "DONE";
      $scope.topic.need = "DONE";
      $scope.topic.need = $sce.trustAsHtml($scope.topic.need.
	replace(/&/g, '&amp;').
        replace(/</g, '&lt;').
        replace(/>/g, '&gt;').
        replace(/'/g, '&#39;').
        replace(/"/g, '&quot;').
	replace(/(?:\r\n|\r|\n)/g, '<br />'));
    }
    $scope.judgement = -2;
    $scope.isjdoc = {};
    
    var formatDoc= function(){
      $scope.isjdoc.full = $sce.trustAsHtml($scope.isjdoc.full.
	replace(/&/g, '&amp;').
        replace(/</g, '&lt;').
        replace(/>/g, '&gt;').
        replace(/'/g, '&#39;').
        replace(/"/g, '&quot;').
	replace(/(?:\r\n|\r|\n)/g, '<br />'));
    };
    $scope.doSearch = function(){
      $scope.docno = 0;
      $http.get('search/' + $scope.corpid +'/'+ $scope.isjquery + "/" + $scope.docno ).success(function(data){
        $scope.docno += 1;
        $scope.judgement = 0;
        $scope.isjdoc = data;
        console.log($scope.isjdoc.full);
        formatDoc();
      });
    }
    $scope.nextDoc = function(){
      $http.get('search/' + $scope.corpid + '/' + $scope.isjquery + "/" + $scope.docno).success(function(data){
        $scope.isjdoc = data;

        $scope.judgement = 0;
        $scope.docno += 1;
        formatDoc();
      });
    }
    $scope.judgeDoc = function(){
      $http.get('judge/' +Auth.getrid() +'/' + $scope.topid + '/' + $scope.isjdoc.docid).success(
        function(data){
          $scope.judgement = data.judgement;
      });
    }
    $scope.nextTopic = function(){
      if($scope.topid === -1) return;
      $http.get('topic/' + Auth.getrid() + '/' + $scope.topid).success(function(data){
        $scope.topid = data.topic;
        $scope.corpid
        $location.path('/search/'+$scope.corpid+'/'+$scope.topid);
      });
    }
}]);
