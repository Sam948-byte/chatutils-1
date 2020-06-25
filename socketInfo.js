const fs = require('fs'),util=require('util');
var idData = JSON.parse(fs.readFileSync('idData.json','utf8'));

function getIP(socket){
	// do not use socket.handshake.address, it has no good purpose
	var sHeaders=socket.handshake.headers,
		IP=null,
		methods=[ sHeaders['x-real-ip'],socket['ip'],sHeaders['x-forwarded-for'] ];
	methods.forEach((e,i,a)=>{
		if(typeof e!='undefined'&&IP==null){
			IP=e;
			if(IP.includes(',')){
				IP=IP.split(',')[IP.split(',').length-1].replace(' ','');
				if(IP.length>15)IP=IP.split(',')[0].replace(' ','');
			}
		}
	});
	if(typeof IP!='string')IP='127.0.0.1'
	return IP.replace('::ffff:','')
}

function generateID() {
  // Math.random should be unique because of its seeding algorithm.
  // Convert it to base 36 (numbers + letters), and grab the first 9 characters
  // after the decimal.
  return Math.floor(100000 + Math.random() * 900000).toString()
};

function getID(socket){
	
	if(JSON.parse(fs.readFileSync('idData.json','utf8')) != idData)idData=JSON.parse(fs.readFileSync('idData.json','utf8'));
	
	var a=getIP(socket);
	if(idData[a]!=null)return idData[a]
	while(true){
		var b = generateID();
		if(idData[b]!=null)continue;
		idData[a]=b;
		fs.writeFileSync('idData.json',JSON.stringify(idData));
		break;
	}
	return idData[a];
}
module.exports.getIP=function(socket){return getIP(socket)};
module.exports.getID=function(socket){return getID(socket)};
