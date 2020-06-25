const express=require('express'),
	https=require('https'),
	http=require('http'),
	app=express(),
	discord=require('discord.js'),
	bot=new discord.Client({disableEveryone: true}),
	fetch=require('node-fetch'),
	fs=require('fs'),
	path=require('path'),
	util=require('util'),
	cookieParser=require('cookie-parser'),
	bodyParser=require('body-parser'),
	socketInfo=require('./socketInfo.js'),
	colors=require('colors'),
	start=Date.now(),
	emojiStuff=require('./public/assets/emojis.js'),
	sas=require('socket-anti-spam'),
	whois=require('node-whois');
var config=JSON.parse(fs.readFileSync('config.json','utf-8')),
	dynamicData=JSON.parse(fs.readFileSync('dynamicData.json','utf-8')),
	session = require('express-session')({
		secret: 'secret',
		resave: true,
		saveUninitialized: true
	}),
	io,
	args=process.argv.splice(2),
	port=process.env.PORT||config.port,
	ipRegex=/((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\s*$)|(^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$))/gi,
	ssl={},tt='',
	httpsAgent = new https.Agent({
		rejectUnauthorized: false,
	}),
	ready=(()=>{
		if(config.listenip=='0.0.0.0' || config.listenip=='127.0.0.1')config.listenip='localhost';
		var proto='http';
		if(config.ssl==true)proto='https';
		console.log(`Listening on ${proto}://${config.listenip}:${port}${tt}`.black.bgCyan);
	}),
	genErr=((req,res,code,reason)=>{
		var url=req.url,
			method=req.method;
		res.status(code);
		res.contentType('text/html');
		switch(code){
			case 400:
				return res.send(fs.readFileSync(__dirname+'/public/err/'+code+'.html','utf8').replace('%REASON%',reason).replace(/%METHOD%/gi,method).replace(/%PATH%/gi,url));
				break
			case 403: 
				return res.send(fs.readFileSync(__dirname+'/public/err/'+code+'.html','utf8').replace('%REASON%',reason));
				break
			case 500: 
				return res.send(fs.readFileSync(__dirname+'/public/err/cannot.html','utf8'));
				break
			case 404:
			default:
				return res.send(fs.readFileSync(__dirname+'/public/err/'+code+'.html','utf8').replace(/%METHOD%/gi,method).replace(/%PATH%/gi,url));
				break
		}
	}),
	reloadConfig=(()=>{
		var perhaps=JSON.parse(fs.readFileSync('config.json', 'utf8')),
			perhaps2=JSON.parse(fs.readFileSync('dynamicData.json','utf-8')); // have this stored first, dont set it right away
		
		// check if the two arent similar, if not then continue
		
		if(config!=perhaps)config=perhaps; 
		if(dynamicData!=perhaps2)dynamicData=perhaps2;
	}),
	writeDynamic=(()=>{
		var perhaps=JSON.parse(fs.readFileSync('dynamicData.json', 'utf8'));
		if(dynamicData!=perhaps && JSON.validate(dynamicData))fs.writeFileSync('dynamicData.json',JSON.stringify(dynamicData,null,'\t'),'utf8'); // only write if difference is present and JSON passes
		
		reloadConfig(); // reload after data is written
		
		return true;
	}),
	ban=((type,value,reason)=>{
		reloadConfig();
		reason=reason.substr(0,18); // truncate reason to 18 characters
		value=value.trim(); // trim whitespace
		
		if(reason.length<=0)reason='No reason specified';
		
		if(type=='id'){ //idban
			if(value.length>=9 || value.match(/\D/g))return 'The ID you specified is invalid.';  // dont process invalid values
			
			if(dynamicData.idBans.some(e=>e[0]==value))return 'This ID has already been banned.'; // dont go over bans
			
			dynamicData.idBans.push([value,reason]); // push data
			
			writeDynamic(); // write data
			
			return 'OK, specified ID will be banned.';
		}else if(type=='ip'){ // ipban
			if(!value.match(ipRegex))return 'The IP you specified is invalid.'; // dont process invalid values
			
			if(dynamicData.ipBans.some(e=>e[0]==value))return 'This IP has already been banned.'; // dont go over bans and stuff
			
			dynamicData.ipBans.push([value,reason]); // push data
			
			writeDynamic(); // write data
			
			return 'OK, specified IP will be banned.';
		}
	}),
	bans=(type=>{
		reloadConfig();
		// do an if statement for something this simple
		var arr,str='';
		if(type=='ip')arr=dynamicData.ipBans
		else arr=dynamicData.idBans;
		arr.forEach(e=>{
			str+=`${e[0]} : "${e[1]}", `;
		});
		return str.replace(/, $/g,''); // remove last ", "
	}),
	activeC={},
	last50=[],
	randomNumber=((min,max)=>{  
		return Math.floor(Math.random() * (max - min) + min); 
	}),
	lock=false,killswitch=false,fallbackmode=false,
	primaryChannel={name:'placeholder',topic:'',id:'0000'},
	socketAntiSpam='';

global.ipv='127.0.0.1'; // define ip before its set
global.tlds='(\\.|\\(.*?\\)|\\[.*?\\]|DOT|DOTS| {1,})(?:'; // define tlds before set
(async()=>{ // funky async function
	var res=await fetch('http://bot.whatismyipaddress.com/');
	var body=await res.buffer();
	ipv=await body.toString('utf8');
	
	var tldsRes=await fetch('https://publicsuffix.org/list/effective_tld_names.dat')
	var tldsBody=await tldsRes.buffer();tldsBody=await tldsBody.toString('utf8');var tldsProc=await tldsBody.split('\n');
	//tldsProc=['ly','com','net','org','gov','tk','ml','ga','gq','cf','dev','tld','tech','space','co','co.uk','co.ck','app','dev','art','blog','cam','','','','','us','ru']
	tldsProc.forEach((e,i,a)=>{
		if(!e.match(/(?:\*|\/\/|\s|\.)/gi) && e.length>=1){
			tlds=tlds+(e.replace('.','(?:\\.|\\(.*?\\)|\\[.*?\\]|DOT|DOTS)'))+'|';
		}
	});
	tlds=new RegExp(`${tlds.substr(0,tlds.length-1)})`,'gi');
})();

JSON.validate=((data)=>{
	try{JSON.parse(data); return true}
	catch(err){return err}
});

app.use(session);
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));
if(!args || !args[0])ssl={key: fs.readFileSync('ssl/default.key','utf8'),cert:fs.readFileSync('ssl/default.crt','utf8')};
else switch(args[0].toLowerCase()){
	case'dev':
		tt=', DEV environment';
		ssl={key: fs.readFileSync('ssl/localhost.key','utf8'),cert:fs.readFileSync('ssl/localhost.crt','utf8')}
		break;
	default:
		ssl={key: fs.readFileSync('ssl/default.key','utf8'),cert:fs.readFileSync('ssl/default.crt','utf8')};
}
listen=config.listenip;
if(config.ssl==true)server=https.createServer(ssl,app).listen(port, config.listenip,ready);
else server=http.createServer(app).listen(port, config.listenip,ready);
io=require('socket.io')(server);

socketAntiSpam = new sas({
	banTime:30,
	kickThreshold:7,
	kickTimesBeforeBan:7,
	banning:true,
	io:io
});

app.get('/stats',(req,res,next)=>{
	if(dynamicData == undefined || dynamicData.ipBans == undefined || dynamicData.idBans == undefined)return res.send('Not ready yet!');
	
	res.status('200');res.contentType('text/html');
	res.send(fs.readFileSync(path.join(__dirname,'public/stats.html'),'utf8')
		.replace('%START%',start)
		.replace('%ACTIVEC%',Object.entries(activeC).length)
		.replace('%CC%','#'+primaryChannel.name)
		.replace('%IPBANS%',dynamicData.ipBans.length)
		.replace('%IDBANS%',dynamicData.idBans.length)
	);
	
});

app.use('/cdn1',async(req,res,next)=>{
	var base='https://discordapp.com',
		url=base+req.url,
		response=await fetch(url,{method:req.method}),
		toSend=await response.buffer(),
		ct='text/html';

	response.headers.forEach((e,i,a)=>{
		if(i=='content-type')ct=e; //safely set content-type
	});

	res.status(response.status);
	res.contentType(ct);
	res.send(toSend);
});

app.use('/cdn',async(req,res,next)=>{
	var base='https://cdn.discordapp.com',
		url=base+req.url,
		response=await fetch(url,{method:req.method}),
		toSend=await response.buffer(),
		ct='text/html';
	
	response.headers.forEach((e,i,a)=>{
		if(i=='content-type')ct=e; //safely set content-type
	});

	res.status(response.status);
	res.contentType(ct);
	res.send(toSend);
});

var cleanString=((input)=>{
		reloadConfig();
		
		var output='';
		input.split('').forEach((e,i,a)=>{ // rebuild
			var fullio=input.substr(i-5,i+5) // 5 character buunchio
			if(input.charCodeAt(i)<=127)output+=input.charAt(i);
			else if(emojiStuff.some((e,i,a)=>fullio.includes(e[1])))output+=input.charAt(i);
		});
		
		output=output.trim().replace(/@*everyone/gi,'everyone').replace(/@*here/gi,'here').substr(0,128);//.replace(/([^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFC\u{10000}-\u{10FFFF}]|[\x00-\x1F\x80-\xFF]|[\u{0080}-\u{FFFF}]|[\x7F-\x84]|[\x86-\x9F]|[\uFDD0-\uFDEF]|[\u{1FFFE}-\u{1FFFF}]|[\u{2FFFE}-\u{2FFFF}]|[\u{3FFFE}-\u{3FFFF}]|[\u{4FFFE}-\u{4FFFF}]|[\u{5FFFE}-\u{5FFFF}]|[\u{6FFFE}-\u{6FFFF}]|[\u{7FFFE}-\u{7FFFF}]|[\u{8FFFE}-\u{8FFFF}]|[\u{9FFFE}-\u{9FFFF}]|[\u{AFFFE}-\u{AFFFF}]|[\u{BFFFE}-\u{BFFFF}]|[\u{CFFFE}-\u{CFFFF}]|[\u{DFFFE}-\u{DFFFF}]|[\u{EFFFE}-\u{EFFFF}]|[\u{FFFFE}-\u{FFFFF}]|[\u{10FFFE}-\u{10FFFF}].)/ug,"")
		
		var toFilter=output
			.toLowerCase()
			.replace(/\s/g,'') // remove whitespace
			.replace(/\s\W\D/g,'') // remove all none usual characters
			.replace(/[\s-+()!@#$%^*?&]/g,'') // remove all other none characters
			.replace(',','.') // pog
			.trim()
		;
		dynamicData.filters.forEach((e,i,a)=>{
			if(toFilter.match(new RegExp(e,'gi')))output='[REDACTED]';
		});
		
		// tlds = ['tld','tld'...]
		
		if(toFilter.match(tlds)){
			return '[REDACTED]';
		}
		
		var mentions=output.match(/<@(.*?)>/gi);
		if(mentions!=null && config.disablePings)mentions.forEach((e,i)=>{
			var id=e.match(/\d/g),username='placeholder';
			if(id==undefined || id==null)return; // if there isnt an ID then piss off
			id=id.join('');
			primaryChannel.guild.members.cache.forEach(ee=>{
				if(ee.id==id)username=ee.displayName
			}); // if the id matches the one we found, set the username to the display name
			output=output.replace(e,'``@'+username+'``'); // replace ping with @displayName
		});
		
		return output;
	}),
	ioMsg=(async (data,socket,ip,id,banned)=>{
		var banReason='';
		
		dynamicData.ipBans.forEach(e=>{
			if(ip.startsWith(e[0])){
				banned=true;
				banReason=e[1];
			}
		});
		
		dynamicData.idBans.forEach(e=>{
			if(id.startsWith(e[0])){
				banned=true;
				banReason=e[1];
			}
		});
		
		if(banned)socket.emit('info',{title:'Hey!',content:`Your message cannot be sent at this time. (Reason: ${banReason})`});
		// dont return YET if banned, wait for logs to kick in
		if(lock)return socket.emit('info',{title:'Hey!',content:`Your message cannot be sent at this time. (Lock mode is enabled)`});
		
		// http://check.getipintel.net/check.php?ip=109.236.60.156&contact=doga1tap@protonmail.com&flags=b
		
		if(killswitch)return socket.emit('info',{title:'Hey!',content:`Your message cannot be sent at this time. (Killswitch is enabled)`});
		
		if(typeof data!='object'||typeof data.content!='string'||typeof data.userData!='object'||typeof data.userData[0]!='number'||typeof data.userData[1]!='string')return; // strongly check all values
		
		if(data.content.length<=0)return;
		var userData=data.userData;
			avatarID=userData[0],
			avatarURL='';
		
		if(userData[0]<0 || userData[0]>4)avatarID=0;
		avatarURL='https://cdn.discordapp.com/embed/avatars/'+avatarID+'.png'
		
		if(dynamicData.logging[0]==true){
			var channel=await bot.channels.fetch(dynamicData.logging[1]);
			channel.send({embed:{
				author: { name: userData[1], icon_url: avatarURL},
				description: data.content,
				timestamp: new Date(),
				color: '#03befc',
				footer: {
					text: `IP: ${ip} - ID: ${id} - Banned: ${banned}`
				}
			}});
		}
		
		if(banned)return; // now return after log has done thing
		if(!banned){
			if(fallbackmode){
				// this should only execute on the server and not display on discord
				toPush={
					bot:true,
					color:'#fff',
					avatar:avatarURL,
					authorID:id,
					name:id+': '+cleanString(userData[1]),
					timestamp:Date.now(),
					content:cleanString(data.content),
					id: Math.floor(Math.random() * 100000),
					attachments:[],
					embeds:[],
					mentions:[]
				};
				
				last50.push(toPush);
				
				if(last50.length>50)last50.shift();
				
				io.emit('msg',toPush);
			}else{
				var url;
				if(dynamicData.webhooks[avatarID]!=null)url=dynamicData.webhooks[avatarID];
				else url=dynamicData.webhooks[randomNumber(0,dynamicData.webhooks.length-1)];
				activeC[id].data.msgs++;
				activeC[id].data.name=cleanString(userData[1]);
				fetch(url,{method:'POST',body: JSON.stringify({
					'username': id+': '+cleanString(userData[1]),
					'content': cleanString(data.content),
					'avatar_url': avatarURL
				}),headers: {'Content-Type': 'application/json'} });
			}
		}
	});

io.on('connection',async socket=>{
	var ip=socketInfo.getIP(socket),id=socketInfo.getID(socket),banned=false;
	socket.emit('meta',{name:primaryChannel.name,description:primaryChannel.topic,lock:lock});
	
	activeC[id]=socket;
	activeC[id].data={date:Date.now(), name:'Placeholder', msgs: 0}
	
	var msgCallback=data=>{ioMsg(data,socket,ip,id,banned)},msgsCallback=()=>{socket.emit('msgs',last50)},
	infoCallback=(data)=>{if(activeC[id] != null && typeof data=='object' && typeof data[0]=='string')activeC[id].data.name=data[0]};
	
	// if user is already banned, dont bother at all
	
	if(!dynamicData.idBans.some(eee=>eee[0]==id) && !dynamicData.ipBans.some(eee=>eee[0]==ip))whois.lookup(ip,(err,data)=>{
		reloadConfig();
		if(err)console.log('error in getting ISP'); else{
			var vpnIsps=dynamicData.vpnIsps.some(dd=>data.toLowerCase().includes(dd.toLowerCase())); // go through isp vpns list (ignore character case)
			if(vpnIsps){
				ban('id',id,'VPN detected (ISP)'); // idban person
			}
		}
	});
	
	// if user is already banned, dont bother
	
	if(!dynamicData.idBans.some(eee=>eee[0]==id) && !dynamicData.ipBans.some(eee=>eee[0]==ip)){
		var response=await fetch(`http://check.getipintel.net/check.php?ip=${ip}&contact=${config.contactEmail}&flags=b`),
			body=await response.text();
		if(Number(body) >= 1){
			// ban('id', value, reason)
			ban('id', id, 'VPN detected, API'); // idban person
		}
	}
	
	// add listeners
	
	socket.on('info', infoCallback);
	socket.on('message', msgCallback);
	socket.on('msgs',msgsCallback);
	
	socket.on('disconnect',()=>{
		// remove listeners
		
		socket.off('message',msgCallback);
		socket.off('msgs',msgsCallback);
		socket.off('info',infoCallback);
		
		delete activeC[id]
	});
});

app.use('/', express.static(path.join(__dirname, 'public'))); 

var msgHandle=((e,i,a)=>{
	var toPush={},
		avatar=e.author.avatarURL({format:'webp',dynamic:true,size:32}),
		username=e.author.username,
		timestamp=e.createdTimestamp,
		color='#ffffff',
		embeds=e.embeds,
		mentions=[];
	if(e.member){
		var index=0,highestColor='#ffffff',highestPos='0';
		e.member.roles.cache.forEach((e,i,a)=>{
			if(e.hexColor=='#000000')return;index++;
			if(highestPos<e.rawPosition){
				highestColor=e.hexColor;
				highestPos=e.rawPosition;
			}
		});color=highestColor;
	}
	if(avatar!=null)avatar=avatar.replace('https://cdn.discordapp.com','cdn');
	if(avatar==null)avatar='cdn1/assets/dd4dbc0016779df1378e7812eabaa04d.png';
	if(e.member)username=e.member.displayName;
	Array.from(e.mentions.users).forEach(ee=>{
		var username=e.username;
		
		e.guild.members.cache.some((v,vi)=>{
			if(ee[0] == vi && v.displayName)username=v.displayName;
		});
		
		mentions.push({type:'user',id:ee[0],username:username})
	});
	Array.from(e.mentions.channels).forEach(ee=>{
		var name=ee[1].name;
		mentions.push({type:'channel',id:ee[0],name:name})
	});
	toPush={bot:e.author.bot,color:color,avatar:avatar,authorID:e.author.id,name:username,timestamp:timestamp,content:e.content,id:e.id,attachments:e.attachments,embeds:e.embeds,mentions:mentions};
	last50.push(toPush);
	if(last50.length>50)last50.shift();
	return toPush;
});

bot.on('ready',async()=>{
	reloadConfig();
	bot.user.setPresence({ activity: {type:'PLAYING',name:'Hello world!'},status:'idle'}).catch(err => console.log(err));
	primaryChannel=await bot.channels.fetch(dynamicData.channel);
	var messages=await primaryChannel.messages.fetch({limit: 50});
	
	messages.array().reverse().forEach((e,i,a)=>msgHandle(e,i,a));
	
	console.log('Fetched last 50 messages'.black.bgYellow);
	
	app.get('/invite',async (req,res,next)=>{
		var reason='request from domain: '+req.get('host'),
			invite=await primaryChannel.createInvite({maxAge: 10800, maxUses:5, unique: false, reason: reason});
		
		res.redirect(302,invite.url);

		if(config.logInvites)fs.access('inviteInfo.json',fs.F_OK,(err)=>{
			if(err && err.code==='ENOENT')fs.writeFileSync('inviteInfo.json','{}') // make file exist if it doesnt already
			else if(err)return console.log(err); // dont continue if we cannot handle this error, just log it for later haha
			// file should exist now
			var data=JSON.parse(fs.readFileSync('inviteInfo.json'));
			if(data[req.get('host')]==null)data[req.get('host')]=1
			else data[req.get('host')]++;
			fs.writeFileSync('inviteInfo.json',JSON.stringify(data,null,'\t')); // ok write coolified data
		});
	});
	
});

var typing=[]; // store typing users into this box

bot.on('typingStart', (channel,user)=>{
	if(channel.id!=dynamicData.channel)return;
	var username=user.username;
	channel.guild.members.cache.forEach(e=>{
		if(e.id==user.id)username=e.displayName;
	});
	typing.push([user.id,true,username]);
	io.emit('typing',typing); // send the whole object because brrrrr
	setTimeout(()=>{
		if(typing.some(e=>e[0]==user.id&&e[1]==true)){
			typing.some((e,i,a)=>{
				if(e[0]==user.id)typing.splice(i,1);
			});
			io.emit('typing',typing);
		}
	},10000) // after 10 seconds if user hasnt sent message, default typing to false
});

bot.on('message',async message=>{
	if(message.channel.type=='dm' || message.bot)return;
	reloadConfig(); // have everything updated
	if(message.channel.id==dynamicData.channel)io.emit('msg',msgHandle(message));
	if(typing.some(e=>e[0]==message.author.id&&e[1]==true)){ // if user was typing
		typing.some((e,i,a)=>{
			if(e[0]==message.author.id)typing.splice(i,1);
		});
		io.emit('typing',typing); // send the whole object because brrrrr
	}
	
	var args=message.content.split(' '),
		mod=false,
		helper=false;
	
	config.mods.forEach((e,i)=>{
		var isMod=mod; // set to previous value, if it was changed
		if(message.member==null)return;
		if(e.type=='role'){ // only do role name and id combo for this thing
			isMod=message.member.roles.cache.some(role=>role.id==e.value);
		}else if(e.type=='user')isMod=message.author.id==e.value;
		if(isMod)mod=true;
	});
	
	if(mod==true)helper=true
	else config.helpers.forEach((e,i)=>{
		var isHelper=helper; // set to previous value, if it was changed
		if(message.member==null)return;
		if(e.type=='role')isHelper=message.member.roles.cache.some(role=>role.id==e.value); // only do role name and id combo for this thing
		else if(e.type=='user')isHelper=message.author.id==e.value;
		if(isHelper)helper=true;
	});
	
	switch(args[0].toLowerCase()){
		case'_say':
			if(!mod)return;
			message.delete();
			// for(let i=0;i<20;i++)
			message.channel.send(message.content.substr(args[0].length+1));
			break
		case'_lock':
			if(!helper || killswitch)return;
			lock=!lock;
			io.emit('meta',{name:primaryChannel.name,description:primaryChannel.topic,lock:lock});
			message.channel.send(`OK, lock set to ${lock}.`);
			break
		case'_fallback':
			if(!mod)return;
			fallbackmode=!fallbackmode;
			io.emit('meta',{name:primaryChannel.name,description:primaryChannel.topic,lock:lock});
			message.channel.send(`OK, fallbackmode set to ${fallbackmode}.`);
			break
		case'_killswitch':
			if(!mod)return;
			killswitch=!killswitch;
			lock=killswitch;
			io.emit('meta',{name:primaryChannel.name,description:primaryChannel.topic,lock:lock});
			message.channel.send(`OK, killswitch set to ${killswitch}.`);
			
			break
		case'_disconnect':
			if(!args[1] || !args[1].match(/\d/gi))return message.channel.send('Specify a valid ID first!');
			if(!Object.entries(activeC).some((e,i)=>e[0]==args[1]))return message.channel.send('User with specified ID was not found.');
			Object.entries(activeC).forEach((e,i,a)=>{
				var id=e[0];
				var socket=activeC[id];
				if(id==args[1]){
					socket.emit('action',['exit','about:blank']);
					socket.disconnect();
					
				}
			});
			
			return message.channel.send(`OK, user with ID ${id} was disconnected.`);
			
			break
		case'_idbans':
			if(!mod)return;
			
			return message.channel.send(bans('ids')); // call the function and get a response
			
			break
		case'_ipbans':
			if(!mod)return;
			
			return message.channel.send(bans('ips')); // call the function and get a response
			
			break
		case'_idban':
			if(!mod)return;
			
			var value=args[1], reason=message.content.substr(args[0].length+args[1].length+2,128);
			
			return message.channel.send(ban('id', value, reason));
			
			break
		case'_ipban':
			if(!mod)return;
			
			var value=args[1], reason=message.content.substr(args[0].length+args[1].length+2,128);
			
			return message.channel.send(ban('ip', value, reason));
			
			break
		case'+idban':
			if(!mod)return;
			reloadConfig();
			
			var whom=args[1];
			if(!dynamicData.idBans.some(e=> e==whom))return message.channel.send(`This ID isn't banned.`);
			
			dynamicData.idBans.forEach((e,i)=>{if(e==whom)dynamicData.idBans.splice(i,1)});
			writeDynamic();
			
			message.channel.send('OK, specified ID will be unbanned.');
			break
		case'+ipban':
			if(!mod)return;
			reloadConfig();
			
			var whom=args[1];
			if(!dynamicData.ipBans.some(e=> e==whom))return message.channel.send(`This IP isn't banned.`);
			
			dynamicData.ipBans.forEach((e,i)=>{if(e==whom)dynamicData.ipBans.splice(i,1)});
			writeDynamic();
			
			message.channel.send('OK, specified IP will be unbanned.');
			break
		case'_online':
			if(!helper)return;
			
			var embed={color: 0x0099ff,
			 description: `Connected users: ${Object.entries(activeC).length}`,
			 fields: []
			};
			Object.entries(activeC).forEach((e,i,a)=>{
				var socket=activeC[e[0]];
				var ud=new Date(Date.now() - socket.data.date);
				var s=Math.round(ud.getSeconds());
				var m=Math.round(ud.getMinutes());
				var h=Math.round(ud.getUTCHours());
				var connectTime=`${h} hours, ${m} minutes, ${s} seconds`;
				var msgCount=socket.data.msgs;
				embed.fields.push({
				name: e[0]+': '+socket.data.name,
				value: `time: ${connectTime} msgs: ${msgCount}`,
				inline: true});
			});
			message.channel.send({embed:embed});
			break
		case'_setchannel':
			if(!mod)return;
			reloadConfig();
			
			console.log(`Setting channel to <#${message.channel.name}> (${message.channel.id})`.black.bgRed);
			
			dynamicData.channel=message.channel.id;
			bot.channels.fetch(dynamicData.channel).then(channel => { channel.messages.fetch({ limit: 50 }).then(messages => {
				messages.array().reverse().forEach((e,i,a)=>msgHandle(e,i,a));
			})});
			writeDynamic();
			console.log('Fetched last 50 messages'.black.bgYellow);
			primaryChannel=await bot.channels.fetch(dynamicData.channel);
			var webhooks=await message.guild.fetchWebhooks();
			var index=0;
			dynamicData.webhooks=[];
			webhooks.forEach(async (e,i,a)=>{
				if(!e.name.startsWith('§') || index > 2)return;
				index++;
				var newHook=await e.edit({name: '§ Chat Parser', channel: message.channel.id})
				dynamicData.webhooks.push(newHook.url);
				writeDynamic();
			});
			for(let i=0;i<(3-index);i++){
				var newHook=await message.channel.createWebhook('§',{reason:'because there wasnt enough webhooks'})
				dynamicData.webhooks[i]=newHook.url;
				writeDynamic();
			}
			message.channel.send(`OK, channel set to <#${message.channel.id}>`);
			io.emit('action',['reload']);
			break
		case'_setlogging':
			reloadConfig();
			
			console.log(`Setting logging channel to <#${message.channel.name}> (${message.channel.id})`.black.bgRed);
			
			dynamicData.logging=[true,message.channel.id]
			writeDynamic();
			message.channel.send(`OK, logging channel set to <#${message.channel.id}>`);
			break
		default: break;
	}
	
});

bot.on('messageDelete',message=>{
	if(message.channel.id!=dynamicData.channel)return;
	io.emit('delMsg',{id:message.id});
	last50.some((e,i,a)=>{
		if(e.id == message.id)last50.splice(i,1);
	});
});

bot.on('messageUpdate', (oldMsg,newMsg) => {
	if(oldMsg.channel.id!=dynamicData.channel)return;
	io.sockets.emit('updateMsg',{id:oldMsg.id,newc:newMsg.content});
	last50.some((e,i,a)=>{
		if(e.id == newMsg.id){
			last50[i].content=newMsg.content;
			last50[i].edited=true;
		}
	});
});

bot.login(config.token);

module.exports=((rl)=>{
rl.on('line', function(line) {
	var args=line.split(' '),
		mts=line.substr(args[0].length+1,128);
	switch(args[0]){
		case'run': // debugging
			try{console.log(util.format(eval(mts)))}
			catch(err){console.log(util.format(err))};
			break
		case'stop':case'exit':
			process.exit(0);
			break
		case'_fallback':
			fallbackmode=!fallbackmode;
			io.emit('meta',{name:primaryChannel.name,description:primaryChannel.topic,lock:lock});
			console.log(`OK, fallbackmode set to ${fallbackmode}.`);
			break
		case'_lock':
			lock=!lock;
			io.emit('meta',{name:primaryChannel.name,description:primaryChannel.topic,lock:lock});
			console.log(`OK, lock set to ${lock}.`);
			break
		case'_killswitch':
			killswitch=!killswitch;
			lock=killswitch;
			io.emit('meta',{name:primaryChannel.name,description:primaryChannel.topic,lock:lock});
			console.log(`OK, killswitch set to ${killswitch}.`);
			
			break
		case'_disconnect':
			if(!args[1] || !args[1].match(/\d/gi))return console.log('Specify a valid ID first!');
			if(!Object.entries(activeC).some((e,i)=>e[0]==args[1]))return console.log('User with specified ID was not found.');
			Object.entries(activeC).forEach((e,i,a)=>{
				var id=e[0];
				var socket=activeC[id];
				if(id==args[1]){
					socket.emit('action',['exit','about:blank']);
					socket.disconnect();
					
				}
			});
			
			return console.log(`OK, user with ID ${id} was disconnected.`);
			
			break
		default:
			if(!args[0])return; // if slap enter key
			console.log(`app: ${args[0]}: command not found`);
			break
	}
});
});