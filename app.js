const fs=require('fs'),
	util=require('util'),
	rl=require('serverline');

try{
	require('./server.js')(rl)
}catch(err){
	fs.appendFileSync('err.log',`${util.format(err)}\n`);
	console.log(err);
}

rl.init();
rl.setPrompt('> ');

rl.on('SIGINT',(rl)=>process.exit(0)); // ctrl+c quick exit