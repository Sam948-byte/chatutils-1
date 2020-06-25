var uptimeEle=document.getElementById('uptime'),
	start=uptimeEle.getAttribute('data'),
	getDifference=((begin,finish)=>{
		var ud=new Date(finish-begin);
		var s=Math.round(ud.getSeconds());
		var m=Math.round(ud.getMinutes());
		var h=Math.round(ud.getUTCHours());
		return h+' hours, '+m+' minutes, '+s+' seconds';
	});
setInterval(()=>{
	uptimeEle.innerHTML=getDifference(start,Date.now());
},100)