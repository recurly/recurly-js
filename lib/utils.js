exports.addParams = function(route, keys){
    var path = route[0];
    route[0] = path.replace(/(:[^\/]+)/g, function(){
        var key = arguments[0].substr(1);
        return keys[key];
    });
    return route;
}

exports.addQueryParams = function(route, params){
    var _params = [];
    if(params){
        for(var prop in params){
            _params.push(prop+'='+ encodeURIComponent(params[prop]));
        }
    }
    if(_params.length > 0) return [route[0] + '?' + _params.join('&'), route[1]];
    else return route;
}