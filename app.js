const fs=require('fs'),
	util=require('util'),
	rl=require('serverline'),
	colors=require('colors');

try{
	var config=JSON.parse(fs.readFileSync('config.json','utf8'));
	if(config.token.match(/\s/)){ // check for whitespace
		console.log('Error:'.black.bgRed, ' Your bot token contains an invalid whitespace! Please check if you followed the setup process correctly.');
		process.exit(0);
	}else if(config['contactEmail']==='insertContact@domain.tld')console.log('Warning:'.black.bgBrightYellow, ' Your contact email has not been changed, if this was intentional then ignore.');
}catch(err){
	console.log('Your config has an error!');
}

try{
	require('./server.js')(rl)
}catch(err){
	fs.appendFileSync('err.log',`${util.format(err)}\n`);
	console.log(err);
}

rl.init();
rl.setPrompt('> ');

rl.on('SIGINT',(rl)=>process.exit(0)); // ctrl+c quick exit