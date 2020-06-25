console.log('>>>  Know what you\'re doing here? Consider contributing on our github at https://github.com/titaniumnetwork-dev/chatutils');

var msgForm=document.getElementById('msgForm'),
	msgInput=document.getElementById('msgInput'),
	msgs=document.getElementById('msgs'),
	socket=io(),
	name=generateName(),
	avatar=0,
	prevInfo=['avatar','username','author']
	scrollBottom=false,
	emojiButton=document.getElementById('emojiButton'),
	emojiMenu=document.getElementById('emojiMenu'),
	emojiMenuOpen=false,
	emojiList=document.getElementById('emojiList'),
	emojiSearch=document.getElementById('searchEmojis'),
	emojiDisplay=document.getElementsByClassName('emojiDisplay')[0],
	emojiDisplayName=document.getElementsByClassName('emojiDisplayName')[0],
	avatarInfo=document.getElementById('infoavatar'),
	usernameInfo=document.getElementById('infoname'),
	userData=[0,generateName()],
	scrolling=true,
	channelName='general';

if(localStorage.getItem('userData')==null)localStorage.setItem('userData','[0,"'+generateName()+'"]');
userData=JSON.parse(localStorage.getItem('userData'));

avatarInfo.style['background-image']='url("cdn/embed/avatars/'+userData[0]+'.png")';
usernameInfo.value=userData[1];
socket.emit('info',[userData[1]]);

avatarInfo.addEventListener('click',()=>{
	var newData=userData;
	userData[0]++;
	if(userData[0]==5)newData[0]=0;
	userData=newData;
	localStorage.setItem('userData',JSON.stringify(userData));
	avatarInfo.style['background-image']='url("cdn/embed/avatars/'+userData[0]+'.png")';
});

usernameInfo.addEventListener('keyup',()=>{ // when a key is fully pressed
	var newData=userData;
	newData[1]=usernameInfo.value;
	userData=userData;
	localStorage.setItem('userData',JSON.stringify(userData));
});

usernameInfo.addEventListener('blur',()=>{ // when focus is lost
	socket.emit('info',[userData[1]]);
});

var decodeEntities = ((str)=>{
	// this prevents any overhead from creating the object each time
	var element = document.createElement('div');
	if(str && typeof str === 'string') {
	// strip script/html tags
	str = str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
	str = str.replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gmi, '');
	element.innerHTML = str;
	str = element.textContent;
	element.textContent = '';
	}return str
});

msgInput.addEventListener('keyup',(e)=>{
	//if(msgInput.innerHTML.includes('br'))msgInput.innerHTML=msgInput.innerHTML.replace(/<\/?br>/gi,'');
	if(msgInput.innerHTML=='')msgInput.setAttribute('data',channelName); // input field empty
	else msgInput.setAttribute('data','');
});

msgInput.addEventListener('keydown',(e)=>{
	//if(msgInput.innerHTML.includes('br'))msgInput.innerHTML=msgInput.innerHTML.replace(/<\/?br>/gi,'');
	if(msgInput.innerHTML=='')msgInput.setAttribute('data',channelName); // input field empty
	else msgInput.setAttribute('data','');
	/*Array.from(msgInput.getElementsByTagName('*')).forEach((e,i)=>{
		if(e.tagName=='BR')e.parentNode.removeChild(e);
	});*/
	if(e.code=='Enter'){
		e.preventDefault();
		Array.from(msgInput.getElementsByClassName('emoji')).forEach((e,i)=>{
			msgInput.innerHTML=msgInput.innerHTML.replace(e.outerHTML,e.getAttribute('alt'));
		});
		var msg=msgInput.innerHTML; // store variable before clearing the thing
		msgInput.innerHTML='';
		socket.emit('message',{content:decodeEntities(msg), userData:userData}); // TODO: replace decodeEntities function with cooler coode
	}
});

var procAttach=((content,e)=>{
		var embedEle=document.createElement('div'),embed,
			videoReg=/.*?\.(mp4||webm|mkv|flv|fv4|vob|ogg|ogv|gif|gifv|mng|avi|mts|m2ts|ts|mov|qt|wmv|yuv|asf|amv|m4p|m4v|mpg|mp2|mpeg|mpe|mpv|drc)(?:$|\?.*)/i,
			type='';
		content.appendChild(embedEle);
		
		if(e.url.match(/.*?\.(png|jpg|jpeg|webp)($|\?.*)/gi)){
			embed=document.createElement('img');
			type='image'
		}
		if(e.url.match(videoReg)){
			embed=document.createElement('video');
			type='video'
		}
		if(!embed)return;
		embedEle.appendChild(embed);
		embed.setAttribute('class','embed');
		embedEle.setAttribute('class','embedEle');
		switch(type){
			case'image':
				embed.src=e.url.replace('https://cdn.discordapp.com','cdn');
				//embedEle.style.width=e.width;
				embedEle.style.height=e.height;
				break
			case'video':
				var source=document.createElement('source'),
					type=e.url.replace(videoReg,'$1'),
					xhttp=new XMLHttpRequest(),
					src=e.url.replace('https://cdn.discordapp.com','cdn');
				embed.appendChild(source);
				embed.setAttribute('controls','');
				embed.style.height='auto';
				embed.style.top='-9px';
				embedEle.style['max-height']='unset';
				source.setAttribute('src',src);
				//source.setAttribute('type','video/'+type); // guess the type at first, will be changed later
				
				xhttp.open('HEAD', src);
				xhttp.addEventListener('readystatechange',()=>{
					if(xhttp.readyState==xhttp.DONE){
						source.setAttribute('type',xhttp.getResponseHeader("Content-Type"));
					}
				});
				xhttp.send();
			
		}
	}),
	doEmbedStuff=((content,vEmbeds)=>{
		if(vEmbeds.length>=1){
			vEdited=false;
			vEmbeds.forEach((e,i)=>{
				console.log(e);
				
				if(e.type!='rich' || e.color == undefined)return;
				var embed=document.createElement('div'),
					embedContent=document.createElement('div'),
					description=document.createElement('div');
				
				content.appendChild(embed);
				embed.appendChild(embedContent);
				embed.style['border-color']=e.color;
				
				embedContent.appendChild(description);
				embedContent.setAttribute('class','msgEmbed-content');
				
				description.setAttribute('class','msgEmbed-description');
				description.innerHTML=e.description;
				
				
				embed.setAttribute('class','msgEmbed');
				
				if(e.fields){
					var fields=document.createElement('div');
					fields.setAttribute('class','msgEmbed-fields');
					embedContent.appendChild(fields);
					e.fields.forEach((ee,ii)=>{
						var field=document.createElement('div'),
							fieldName=document.createElement('div'),
							fieldValue=document.createElement('div');
						
						fields.appendChild(field);
						field.appendChild(fieldName);
						field.appendChild(fieldValue);
						
						fieldName.innerHTML=ee.name;
						fieldValue.innerHTML=ee.value;
						
						if(ee.inline==true)field.setAttribute('class','msgEmbed-field inline')
						else field.setAttribute('class','msgEmbed-field');
						fieldName.setAttribute('class','msgEmbed-fieldName');
						fieldValue.setAttribute('class','msgEmbed-fieldValue');
					});
				}
			});
		}
	});
	
var sanatize=((str)=>{
		if(typeof str == 'string')return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/>/g, '&gt;').replace(/'/g,'&apos;')
		else return'';
	}),
	process=((str)=>{
		return str
		.replace(/&lt;a(:.*?:)(\d*?)&gt;/gi,'<img class="emoji" src="cdn/emojis/$2.gif?v=1" data="$1" alt="$1"></img>')
		.replace(/&lt;(:.*?:)(\d*?)&gt;/gi,'<img class="emoji" src="cdn/emojis/$2.png?v=1" data="$1" alt="$1"></img>')
		.replace(/\*\*(.*?)\*\*/gi,'<b>$1</b>')
		.replace(/\*(.*?)\*/gi,'<i>$1</i>')
		.replace(/__(.*?)__/gi,'<u>$1</u>')
		.replace(/~~(.*?)~~/gi,'<span class="strike">$1</span>')
		.replace(/(https?:\/\/.*?(\s|$))/gi,'<a href="$1">$1</a> ')
		.replace(/&lt;(.*?:\/\/.*?)&gt;/gi,'<a href="$1">$1</a>')
		.replace(/```((?:.|\s){1,})```/gi,'<pre><code class="markdown2">$1</code></pre>')
		.replace(/``?((?:.|\s){1,}?)?``?/gi,'<code class="markdown1">$1</code>');
	}),
	getMsg=((vBot,vColor,vAvatar,authorID,vName,vTimestamp,vContent,vId,vEmbeds,vAttachments,vMentions,vEdited)=>{
		var allMsgs=msgs.getElementsByClassName('msg');
		
		// TODO: REMOVE MESSAGES PAST THE 50 LIMIT
		
		vContent=process(sanatize(vContent));
		var sName=sanatize(vName);
		
		if(vMentions!=undefined)vMentions.forEach((e,i,a)=>{
			if(e.type=='user')vContent=vContent.replace(new RegExp(`&lt;@!?${e.id}*&gt;`,'gi'),'<div class="mention interactive" id="'+e.id+'">@'+e.username+'</div>')
			else if(e.type=='channel')vContent=vContent.replace(new RegExp(`&lt;#!?${e.id}*&gt;`,'gi'),'<div class="mention interactive" id="'+e.id+'">#'+e.name+'</div>');
		});
		
		if(vEmbeds.length==0 && vEdited)vContent=vContent+'<span class="edited">(edited)</span>';
		
		if(prevInfo[0]===vAvatar && prevInfo[1]===sName && prevInfo[2]==authorID){
			msg=allMsgs[allMsgs.length-1];
			var content=document.createElement('div');
			msg.appendChild(content);
			content.setAttribute('class','content');
			content.innerHTML=vContent;
			content.setAttribute('id',vId);
			if(vAttachments!=undefined)vAttachments.forEach(e=>procAttach(content,e));
			twemoji.parse(content);
			doEmbedStuff(content,vEmbeds);
			/*Array.from(content.getElementsByClassName('emoji')).forEach(e=>{
				var ele=document.createElement('div');
				var data=e.getAttribute('data');
				if(typeof data!='string')emojiStuff.some(ee=>{if(ee[1]==e.getAttribute('alt'))data=ee[0]});
				e.parentNode.replaceChild(ele,e);
				ele.appendChild(e);
				ele.setAttribute('data',data);
				ele.setAttribute('class','emojiContainer');
			});*/
			if(scrolling)msgs.scrollTop = msgs.scrollHeight;
			
			prevInfo=[vAvatar,sName,authorID];
			
			return;
		}
		
		prevInfo=[vAvatar,sName,authorID];
		
		var msg=document.createElement('div'),
			avatar=document.createElement('div'),
			name=document.createElement('div'),
			timestamp=document.createElement('div'),
			content=document.createElement('div'),
			actionMenu=document.createElement('div'),
			reactButton=document.createElement('div');
		
		// append to message
		
		msgs.appendChild(msg);
		msg.appendChild(avatar);
		msg.appendChild(name);
		if(vBot){
			var userClass=document.createElement('span');
			msg.appendChild(userClass);
			userClass.innerHTML='BOT';
			userClass.setAttribute('class','userClass');
		}
		msg.appendChild(timestamp);
		msg.appendChild(content);
		msg.appendChild(actionMenu);
		
		actionMenu.appendChild(reactButton);
		
		// set styles and stuff
		
		var time=new Date(vTimestamp),timeStr=new Intl.DateTimeFormat('en-US',{day: '2-digit', month: '2-digit', year: '2-digit'}).format(time)//.toLocaleString(undefined,{localeMatcher:'lookup',weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric'});
		if(time.getDate() == new Date().getDate())timeStr='Today at '+time.toLocaleString(undefined,{localeMatcher:'lookup',hour: 'numeric',minute: 'numeric'}); // if date is from today
		else if(time.getDate() == new Date().getDate()-1)timeStr='Yesterday at '+time.toLocaleString(undefined,{localeMatcher:'lookup',hour: 'numeric',minute: 'numeric'}); // if date was from yesterday
		
		actionMenu.setAttribute('class','actionMenu');
		reactButton.setAttribute('class','reactButton');
		reactButton.setAttribute('data','Add Reaction');
		
		reactButton.insertAdjacentHTML('beforeend','<svg class="icon-3Gkjwa" aria-hidden="false" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M12.2512 2.00309C12.1677 2.00104 12.084 2 12 2C6.477 2 2 6.477 2 12C2 17.522 6.477 22 12 22C17.523 22 22 17.522 22 12C22 11.916 21.999 11.8323 21.9969 11.7488C21.3586 11.9128 20.6895 12 20 12C15.5817 12 12 8.41828 12 4C12 3.31052 12.0872 2.6414 12.2512 2.00309ZM10 8C10 6.896 9.104 6 8 6C6.896 6 6 6.896 6 8C6 9.105 6.896 10 8 10C9.104 10 10 9.105 10 8ZM12 19C15.14 19 18 16.617 18 14V13H6V14C6 16.617 8.86 19 12 19Z"></path><path d="M21 3V0H19V3H16V5H19V8H21V5H24V3H21Z" fill="currentColor"></path></svg>');
		
		
		msg.setAttribute('class','msg');
		avatar.setAttribute('class','avatar');
		name.setAttribute('class','name');
		name.setAttribute('author',authorID);
		timestamp.setAttribute('class','timestamp');
		content.setAttribute('class','content');
		content.setAttribute('id',vId);
		// set contents
		
		avatar.style['background-image']='url("'+vAvatar+'")';
		name.style['color']=vColor;
		name.innerHTML=vName;
		
		/*name.addEventListener('click',()=>{
			var mention=document.createElement('span'),
				slate=document.createElement('span');
			msgInput.appendChild(slate);
			slate.appendChild(mention);
			// <span data-slate-object="text" data-key="13"><span data-slate-leaf="true" data-offset-key="13:0"><span data-slate-zero-width="z" data-slate-length="0">﻿</span></span></span>
			// <span class="mention wrapper-3WhCwL mention interactive" aria-label="MikeLime#8816" tabindex="0" role="button">@MikeLime</span>
			slate.setAttribute('data-slate-object','inline');
			slate.setAttribute('data-key','13');
			slate.setAttribute('contenteditable',false);
			
			mention.setAttribute('tabindex',0);
			mention.setAttribute('class','mention-int interactive');
			mention.innerHTML='@'+vName;
			mention.setAttribute('id',authorID);
			
			mention.addEventListener('keyPress',(e)=>{
				var n = t.props,
					r = n.onClick,
					i = n.href,
					a = n.onKeyPress;
				e.repeat || (null == r || null == t.ref || e.charCode !== o.KeyboardKeys.SPACE && e.charCode !== o.KeyboardKeys.ENTER || (null == i && e.preventDefault(), t.ref.click()), null != a && a(e))
			});
		});
		*/
		
		content.innerHTML=vContent;
		timestamp.innerHTML=timeStr;
		
		if(vAttachments!=undefined)vAttachments.forEach(e=>procAttach(content,e));
		
		twemoji.parse(content);
		
		doEmbedStuff(content,vEmbeds)
		
		/*Array.from(content.getElementsByClassName('emoji')).forEach(e=>{
			var ele=document.createElement('div');
			var data=e.getAttribute('data');
			if(typeof data!='string')emojiStuff.some(ee=>{if(ee[1]==e.getAttribute('alt'))data=':'+ee[0]+':'});
			e.parentNode.replaceChild(ele,e);
			ele.appendChild(e);
			ele.setAttribute('data',data);
			ele.setAttribute('class','emojiContainer');
		});*/
		
		if(scrolling)msgs.scrollTop = msgs.scrollHeight; // if user is scrolling up somewhere let them be
	});

msgs.addEventListener('scroll',()=>{
	scrollBottom=msgs.scrollTop === (msgs.scrollHeight - msgs.offsetHeight);
});

socket.emit('msgs'); // send the thing to get messages

socket.on('msgs',data=>{ // process the messages now
	msgs.innerHTML='';
	data.forEach((e,i,a)=>{
		getMsg(e.bot,e.color,e.avatar,e.authorID,e.name,e.timestamp,e.content,e.id,e.embeds,e.attachments,e.mentions,e.edited);
	});
	setTimeout(()=>msgs.scrollTop = msgs.scrollHeight+10000,200);
});

socket.on('msg',e=>{
	getMsg(e.bot,e.color,e.avatar,e.authorID,e.name,e.timestamp,e.content,e.id,e.embeds,e.attachments,e.mentions);
});

socket.on('delMsg',e=>{
	var content=document.getElementById(e.id);
	console.log(Array.from(content.parentNode.getElementsByClassName('content')).length)
	if(Array.from(content.parentNode.getElementsByClassName('content')).length<=1)content.parentNode.parentNode.removeChild(content.parentNode)
	else document.getElementById(e.id).parentNode.removeChild(document.getElementById(e.id)); // destroy message
});

socket.on('updateMsg',e=>{
	var ele=document.getElementById(e.id);
	if(!e.newc.includes('<span class="edited">(edited)</span>'))e.newc=e.newc+'<span class="edited">(edited)</span>';
	ele.innerHTML=e.newc;
});

socket.on('meta',e=>{
	console.log(e);
	document.getElementsByClassName('activeInfo-name')[0].innerHTML=e.name;
	if(e.description != undefined && e.description.length>=1)document.getElementsByClassName('activeInfo-description')[0].innerHTML=e.description;
	if(e.lock==false){
		msgInput.setAttribute('class','');
		msgInput.setAttribute('contenteditable',true);
		channelName='Message #'+e.name;
	}else{
		msgInput.setAttribute('class','disabled');
		channelName='You do not have permission to send messages in this channel.';
		msgInput.setAttribute('contenteditable',false);
	}
	msgInput.setAttribute('data',channelName);
});
	
emojiButton.addEventListener('click',()=>{
	emojiMenuOpen=!emojiMenuOpen;
	if(emojiMenuOpen){
		emojiMenu.style.display='block';
		emojiSearch.focus();
	}else{
		emojiMenu.style.display='none';
	}
});

//twemoji.parse(emojiList);

emojiStuff.forEach(e=>{
	var emojiContainer=document.createElement('div');
	emojiList.appendChild(emojiContainer);
	emojiContainer.setAttribute('class','emojiItem');
	emojiContainer.setAttribute('data',e[0]);
	emojiContainer.innerHTML=e[1];
	twemoji.parse(emojiContainer);
	emojiContainer.addEventListener('click',()=>{
		emojiMenu.style.display='none';
		emojiSearch.value='';
		msgInput.innerHTML=msgInput.innerHTML+' '+e[1]+' ';
		twemoji.parse(msgInput);
		msgInput.focus();
		emojiMenuOpen=false;
		if(msgInput.innerHTML=='')msgInput.setAttribute('data',channelName); // input field empty
		else msgInput.setAttribute('data','');
	});
	Array.from(emojiList.getElementsByClassName('emojiItem')).forEach((e,i,a)=>{
		e.style.display='block';
	});
});

document.addEventListener('click',e=>{
	var id=e.target.getAttribute('id');
	if(id==null)return;
	if(id!='emojiMenu' && id!='emojiButton' && e.target.parentNode.getAttribute('id')!='emojiMenu' && e.target.parentNode.parentNode.getAttribute('id')!='emojiMenu'){
		emojiMenu.style.display='none';
		emojiMenuOpen=false;
	}
});

emojiSearch.addEventListener('keyup',e=>{
	Array.from(emojiList.getElementsByClassName('emojiItem')).forEach((e,i,a)=>{
		if(emojiSearch.value=='')return e.style.display='block';
		if(!e.getAttribute('data').includes(emojiSearch.value)){
			e.style.display='none';
		}else{
			e.style.display='block';
		}
	});
});

socket.on('action',data=>{
	switch(data[0]){
		case'reload':
			location.reload();
			break
		case'exit':
			socket.disconnect();
			location.href=data[1];
			break
		default: break;
	}
});

var typers=document.getElementsByClassName('typers')[0];

socket.on('typing',typing=>{
	var length=0;
	typing.forEach(e=>{
		if(e[1]==true)length++;
	});
	if(length>0)document.getElementById('typingDots').style.display='inline-block';
	else document.getElementById('typingDots').style.display='none';
	switch(length){
		case 0:
			typers.innerHTML='';
			break
		case 1:
			typers.innerHTML='<span>'+typing[0][2]+'</span> is typing...';
			break
		case 2:
			typers.innerHTML='<span>'+typing[0][2]+'</span> and <span>'+typing[1][2]+'</span> are typing...';
			break
		case 3:
			typers.innerHTML='<span>'+typing[0][2]+'</span>, <span>'+typing[1][2]+'</span>, and <span>'+typing[2][2]+'</span> are typing...';
			break
		case 4:
			typers.innerHTML='Several people are typing...';
			break
	}
});
var popups=document.getElementById('popups');
socket.on('info',data=>{
	var info=document.createElement('div'),
		title=document.createElement('span'),
		content=document.createElement('span'),
		close=document.createElement('div');
	popups.appendChild(info);
	info.appendChild(title);
	info.appendChild(content);
	info.appendChild(close);
	
	info.setAttribute('class','popup');
	title.setAttribute('class','title');
	content.setAttribute('class','content');
	close.setAttribute('class','material-icons close ns');
	close.innerHTML='close';
	
	info.style.opacity=0;
	setTimeout(()=>info.style.opacity=1,25)

	close.addEventListener('click',()=>{
		info.style.opacity=0;
		setTimeout(()=>info.parentNode.removeChild(info),200)
	});
	
	title.innerHTML=data.title;
	content.innerHTML=data.content;
});