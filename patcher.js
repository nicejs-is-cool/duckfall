/**
 * Duckfall client-side patcher.
 * @author nicejs, 2021
 */
function loadScript(url) {
  let s = document.createElement('script');
  s.src = url;
  document.body.appendChild(s);
  return new Promise(r => s.onload = r);
}
function loadCSS(url) {
	let c = document.createElement('link');
	c.rel = "stylesheet";
	c.href = url;
	document.body.appendChild(c);
	return new Promise(r => c.onload = r);
}
window.markdownEnabled = true;
window.syntaxHighlighting = true;
window.autolinksEnabled = false;
window.customCSS = document.createElement('style');
window.customCSS.id = "customcss-element";
document.body.appendChild(window.customCSS);
window.customScript = {
  load: "/* executed when the server is joined */",
  unload: "/* executed once the user leaves the server */"
}
loadScript('https://unpkg.com/showdown/dist/showdown.min.js').then(() => {
	window.showdown_converter = new showdown.Converter();
	window.showdown_converter.setOption('openLinksInNewWindow',true);
	window.showdown_converter.setOption('emoji',true);
	
});
loadCSS('//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/styles/vs.min.css');
loadScript('//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/highlight.min.js');


document.addEventListener('DOMContentLoaded',() => {
	socket._callbacks.$message[0] = function(data) {
	if (!data || typeof data.msg !== 'string') return;
  if (data.nick==undefined) {return};
  if (data.nick==null) {return};
	if (window.syntaxHighlighting) {
		let codeBlockRegex = /```([a-z]*)\n(.*)\n```/gs;
		if (data.msg.match(codeBlockRegex)) {
			data.msg = data.msg.replace(codeBlockRegex,(str, language, code) => {
				return `<div style="background: white; padding: 3px; color: black;">${hljs.highlight(he.decode(code),{language}).value}</div>`
			})
		}
		
	}
	if (window.markdownEnabled && window.showdown_converter) {
		data.msg = window.showdown_converter.makeHtml(data.msg).replace(/<h(\d+)>(.*)<\/h(\d+)>/g,"").replace(/<\/?p>/g,"");
		
	}
  printMsg(data);
  if (pingPolicy == "all" || pingPolicy == "personal"){
    if (data.msg.includes("@"+pseudo) && (!blocked.includes(data.home) && status !== "dnd")){
      noFocusPings = noFocusPings + 1;
      try{
	      document.getElementById(data.id).style="background-color: rgba(255, 225, 0, 0.09)";
    	}catch{};
      if (document.hasFocus() == false || document.hidden){
        new Audio("/notif.ogg").play();
      }
    }
  }
  if (pingPolicy == "all"){
	  if (data.msg.includes("@everyone") && (!blocked.includes(data.home) && status !== "dnd")){
      noFocusPings = noFocusPings + 1;
      try{
	      document.getElementById(data.id).style="background-color: rgba(255, 225, 0, 0.09)";
      }catch{};
      if (document.hasFocus() == false || document.hidden){
        new Audio("/notif.ogg").play();
      }
		}
  }
  // dynamic title
  if (document.hasFocus() == false){
    noFocusMsg = noFocusMsg + 1;
    if (noFocusMsg > 0){
      if (noFocusPings > 0){
        document.title = 'trollbox ('+noFocusPings+'/'+noFocusMsg+')';
      }else{
        document.title = 'trollbox ('+noFocusMsg+')';
      }
    }
  }else{
    noFocusMsg=0;
    noFocusPings=0;
    document.title = 'trollbox';
  }
}
})
function printMsg (data) {
      var check = data.msg.replace(/(<([^>]+)>)/gi, "")
      if (!data || typeof data.msg !== 'string' || data.msg.trim()=='') return;
      if (data.nick==undefined) {return};
      if (data.nick==null) {return};
      if (data.home==undefined||data.home==null||!data.home) {return;};
      if (filtersus){
        if (filter.antisus.action(data)){
          data.msg = "[Blocked by filter]";
        }
      }
      if (data.reply){
        if (document.getElementById(data.for) == null){
          data.msg="Cannot load original message.<hr>"+data.msg;
        }else{
          if (document.getElementById(data.for).getAttribute("class") !== "trollbox_msg"){
            data.msg="Cannot load original message.<hr>"+data.msg;
	        }else{
            try{
              data.msg=document.getElementById(data.for).parentElement.outerHTML.replace(`<duck id="reactionpad-`+data.for+`">`,`<duck>`).replace('<span class="trollbox_msg" id="'+data.for+'"','<span class="trollbox_msg" name="reply-'+data.for+'"')+"<hr>"+data.msg;
	          }catch{
              data.msg="Cannot load original message.<hr>"+data.msg;
            }
	        }
	      }
      }
      if (data.files){
        if (data.files.nsfw){
          if (nsfwPolicy == "none"){
            data.msg=data.msg+"<br>Attachment was hidden. Reason: nsfw filter policy.";
          }
          if (nsfwPolicy == "show"){
            data.msg=data.msg+`<br>/!\\ This message contains nsfw attachment. Show? <button filedata=\``+data.files+`\` onclick="printNsfwAttachment(this.getAttribute('filedata'));">Yes</button> <button onclick="this.parentElement.remove()">No</button> <button onclick="this.parentElement.parentElement.remove()">Delete</button>`;
          }
        }else{
          var flag = false;
          if (data.files.mime.startsWith("image")){
            if (data.files.spoiler == true){
              data.msg=data.msg+"<br>"+`<img title="Click to reveal image." onclick="this.removeAttribute('title');this.style='max-height:20%;max-width:30%;height:auto;width:auto;';" src="`+encodeURI(decodeURI(data.files.url))+`" style="max-height:20%;max-width:30%;height:auto;width:auto;filter:blur(1.5rem);">`;
            }else{
              var duckk = 'popup(`<img src=\'${this.src}\' style=\'max-height:100%;max-width:100%;height:auto;width:auto;\'>`)';
             data.msg=data.msg+"<br><img src='" + encodeURI(decodeURI(data.files.url)) + `' style='max-height:20%;max-width:30%;height:auto;width:auto;' onclick="${duckk}" onerror="this.src='/fail.png';this.parentElement.childNodes[2].style='display: block';this.innerHTML='<br>Image failed to load.';"><br><button style='display: none' onclick='var test=this.parentElement.childNodes[1].src;this.parentElement.childNodes[1].src=null;this.parentElement.childNodes[1].src=test;this.style="display: none;";'>Retry</button>`;
            }
            flag=true;
          }
          if (data.files.mime.startsWith("audio")){
            if (data.files.spoiler == true){
              data.msg=data.msg+`<br><div onclick="this.removeAttribute('style');this.lastChild.removeAttribute('style');" style="filter:blur(1.5rem);"><audio controls src="`+encodeURI(decodeURI(data.files.url))+`" style="pointer-events: none;"/></div>`;
            }else{
              data.msg=data.msg+"<br><audio controls src='" + encodeURI(decodeURI(data.files.url)) + "'>";
            }
            flag=true;
          }
          if (data.files.mime.startsWith("video")){
            if (data.files.spoiler == true){
              data.msg=data.msg+`<br><div onclick="this.removeAttribute('style');this.lastChild.removeAttribute('style');" style="filter:blur(1.5rem);"><video controls="" width="50%" src="`+encodeURI(decodeURI(data.files.url))+`" style="pointer-events: none;"/></div>`;
            }else{
              data.msg=data.msg+`<br><video controls="" width="50%">
        <source type="video/webm" src="${encodeURI(decodeURI(data.files.url))}">
        </video>`;
            }
            flag=true;
          }
          if (flag == false){
            if (data.files.spoiler == true){
              data.msg=data.msg+`<div onclick="this.removeAttribute('style');this.lastChild.removeAttribute('style');" style="filter:blur(1.5rem);"><br><b>${he.escape(data.files.name)}</b><button onclick='downloadURI("${encodeURI(decodeURI(data.files.url))}","${he.escape(data.files.name)}")' style='pointer-events: none;'><font size='5'>⭳</font></button></div>`;
            }else{
              data.msg=data.msg+`<br><b>${he.escape(data.files.name)}</b><button onclick='downloadURI("${encodeURI(decodeURI(data.files.url))}","${he.escape(data.files.name)}")'><font size='5'>⭳</font></button>`;
            }
          }
        }
      }
      reactionspermsg[data.id]=[];
      for (var i = 0; i < blocked.length; i++) { if (data.home==blocked[i]) {return} };
      if (typeof data.nick != "string") {return};

      // /kaomoji
      while (check.includes("/kao")) {
          data.msg = data.msg.replace('/kao', faces[parseInt(Math.random()*faces.length)])
      }
    /*
    if ((check)&&(check.startsWith('data:image/'))) {
       if ( imgShow ) {
          if(data.msg.indexOf("&#62")!=-1){return};
          if(data.msg.indexOf("&#39")!=-1){return};
          data.msg = "<img style='max-width: 98%;' src='"+data.msg+"'>";
       }else{
        data.msg = "You need to type '/img on' to see this."
       }
      }
      */
      var cmd = getCmd(data.msg);
      var ytplayer = false;
      if (ytShow) {
        if (matchYoutubeUrl(data.msg)) {
            if (data.msg.startsWith('https://www.youtube.com/watch?v=')) {
               var id = data.msg.slice(32).trim();
               data.msg='<iframe width="560" height="315" src="https://www.youtube.com/embed/'+id+'" frameborder="0" allowfullscreen></iframe>';
               ytplayer=true;
            }
        };
      };

      if (ytplayer!=true) {
        /*
        if ( imgShow ) {
          var test = (/\.(gif|jpg|jpeg|tiff|png|webp)/i).test(data.msg);
          if (test) {
            message = data.msg.split(" ");
            data.msg = "";
             for (var i = 0; i < message.length; i++) {
               var testa = (/\.(gif|jpg|jpeg|tiff|png|webp)/i).test(message[i]);
               if (testa) {
                 //img
                  if ((/\.(php)/i).test(message[i])) {
                    data.msg = data.msg + " <img style='max-width: 98%;' src=''> "
                  }else{
                    data.msg = data.msg + " <img style='max-width: 98%;' src='"+ message[i] +"'> "
                  }
               }else{
                //txt
                data.msg = data.msg + " " + $io.str.autolink(message[i]);
               }
          };
          }else{data.msg = $io.str.autolink(data.msg);}

        }else{
          data.msg = $io.str.autolink(data.msg);
        }
        */
				if (window.autolinksEnabled) {
					data.msg = $io.str.autolink(data.msg);
				}
				
      };

      words = check.split(" ");
      if (words[0]=="/sin"){
        if (words[1]) {
          string = words[1];
          string = string.substring(0, 50);

        }else{
          string="█";
        }
        if (words[2]) {
        amplitude = words[2];
      }else{
        amplitude = parseInt(Math.random()*100);
      }
        if (data.nick==undefined) {data.nick="anonymouse"};
        if (data.color==undefined) {data.color="white"};
        if (data.style==undefined) {data.style=""};
        if (sin) {
          sinFlood(string, amplitude,data.nick,data.color,data.style)
          return
        };
      };
      //
      if (words[0]=="/say"){

         settings = words[1].split(":")
         words.shift();
         words.shift();
         var temp = words.join(" ").trim();
         say = new SpeechSynthesisUtterance();
         say.volume = 0.5;
         say.text = temp;
         if (settings[0]<0) {settings[0]=0}; if (settings[0]>=2) {settings[0]=2.0};
         say.pitch = settings[0];
         if (settings[1]<0.1) {settings[1]=0.1}; if (settings[1]>=10) {settings[1]=10.0};
         say.rate=settings[1];
         if (voices.length>0) { say.voice=voices[parseInt(settings[2])%voices.length] };
         if (speech&&temp.length>0) {
          speechSynthesis.speak(say);
           data.msg = "🔈 "+temp;
         }else{
           data.msg = "🔇 "+temp;
         }
         //return;
      }
      // vintage emoticons, will add moar sets later.
      if (emoticons) {
        substring = "&#175;\\_(&#12484;)_/&#175;";
        if(data.msg.indexOf(substring) == -1){
          emoSet='msn';
          data.msg = replaceEmoticons(data.msg,emoSet);
        }
      };
      //
      if (words[0]=="/zalgo"){
         var temp = data.msg.slice(6).trim().substring(0, 1000);
         data.msg = zalgo(temp);
      }
      //
      if (cmd) {
        if (cmd.cmd === 'exe') {
          data.msg = '<div class="trollbox_exe"><button title="IF code is suspicious dont click" data-exe="'+he.escape(cmd.val)+'">/js</button>' + he.escape(cmd.val) + '</div>';
        }
	      if (cmd.cmd === 'js') {
          data.msg = '<div class="trollbox_exe"><button title="IF code is suspicious dont click" data-exe="'+he.escape(cmd.val)+'">/js</button>' + he.escape(cmd.val) + '</div>';
        }
      }

      if (data.msg.startsWith('/js ')) {
        var ex = data.msg.slice(4).trim()
        data.msg = '<div class="trollbox_exe"><button title="IF code is suspicious dont click" data-exe="'+ex.replace(/"/g, '\\"')+'">/js</button>' + ex + '</div>';
      }

      var div = document.createElement('div');
      data.nick = data.nick || '●';
      if (data.nick=='●') {pseudo=='●'};
      div.className = 'trollbox_line ui_group';
      div.innerHTML = '<span class="trollbox_h">' + h(data.date) + '</span>'
        + (printNick(data))
        + '<span class="trollbox_msg" id="'+data.id+'" system="'+data.system+'" own="'+data.own+'" for="'+data.for+'">' + data.msg + '<br><duck id="reactionpad-'+data.id+'"></duck></span>'
        // + '<span class="trollbox_msg" style="color:'+data.color+'">' + data.msg + '</span>'
      ;
      trollbox_scroll.appendChild(div);
      if (getScrollPos()>90) {scrollDown();};

}