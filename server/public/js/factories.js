var trecfactory = angular.module('trecfactory',[]);

trecfactory.factory('Auth', ['$http', '$q', function($http, $q){
  var info = { gid : ""};
  return{
    setinfo : function(newgid){
      info.gid = newgid;
      return $http.get("/validate/"+info.gid).then(function(resp){
        if(resp.status === 200){
          return info.gid
        }else{
          return $q.reject(resp.data);
        }
      }, function(resp){
          return $q.reject(resp.data);
      });
    },
    getgid : function(){
      return info.gid;
    }
  }

}]);
