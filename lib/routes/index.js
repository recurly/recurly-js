var routes = {
	'v2': require('./v2')	
};


exports.routes = function(version){
	if(routes['v'+ version]){
		return routes['v' + version];
	}else{
		throw new Error('The API version v'+version+' is not available!');
	}
};