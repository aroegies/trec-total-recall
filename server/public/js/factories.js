var trecfactory = angular.module('trecfactory',[]);

trecfactory.factory('Auth', ['$http', '$q', function($http, $q){
  var info = { gid : "", rid : ""};
  return{
    setinfo : function(newgid){
      info.rid = newgid;
      return $http.get("/validated/"+info.rid).then(function(resp){
        if(typeof resp.data === 'object'){
          return resp.data.runid; 
        }else{
          return $q.reject(resp.data);
        }
      }, function(resp){
          return $q.reject(resp.data);
      });
    },
    getrid : function(){
      return info.rid;
    }
  }

}]);
