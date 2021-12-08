const express = require('express');
const request = require('request');
const http = require('http');
const {Worker} = require('worker_threads');
const colors = require('colors/safe');
const ansi = require('ansi')(process.stdout);
var middleware = require('socketio-wildcard')();
const serverMngrRouter = require('./servermngr');

const Database = require("@replit/database")
const db = new Database()

;(async () => {
	const info = {
		name: "Duckfall",
		color: "yellow"
	}
	// these are all the servers:
	let serverList = await db.get('servers');
	setInterval(async () => {
		serverList = await db.get('servers');
	},5*60*1000)

	const Pinger = new Worker("./pinger.js",{
		workerData: serverList
	})

	Pinger.on('message',srv => servers = srv);

	// these are the avaliable servers:
	var servers = []

	let cur = 0;

	const handler = (req, res) => {
		//console.log(servers);
		if (servers.length === 0) return res.status(502).send('Could not find a online server.')
		//var serverurl = servers[cur] + req.url
		var serverurl = servers[0].url + req.url;
		//console.log(`[${colors.blue('...')}] Proxying connection to ${req.url}`)
		const _req = request({ url: serverurl }).on('error', error => {
			res.status(500).send(error.message);
		});
		req.pipe(_req).pipe(res);
		//cur = (cur + 1) % servers.length;
	};
	const app = express()
	app.get('/ping',(req,res) => {
		res.send('pong!')
	});
	app.get('/',(req,res) => {
		if (servers.length === 0) return res.status(502).send('Could not find a online server.')
		res.sendFile(__dirname+"/client.html");
	});
	app.get('/patcher.js',(req, res) => res.sendFile(__dirname+"/patcher.js"))
	app.use('/server-manager',serverMngrRouter);
	app.get('*', handler).post('*', handler);
	const server = http.createServer(app);
	const io = require('socket.io')(server);

	io.use(middleware);

	const cio = require('socket.io-client');

	function initClient(client,socket,clientduc,{ clientIP, headers}) {
		var patch = require('socketio-wildcard')(cio.Manager);
		patch(client);
		
		client.on('*',packet => {
			//console.log('receiving',packet.data)

			socket.emit(...packet.data)
		})

		client.on('transferServer',(address) => {
			ansi
				.write('[')
				.blue()
				.write('LOG')
				.reset()
				.write(`] Transferring ${socket.id} To ${address}\n`);
			transferServer(client,socket,address,clientIP,headers)
				.then((data) => {
					clientduc(data.client);
					//initClient(data.client,socket,clientduc, { clientIP, headers })
				})
		})
		client.on('clientConfig',(config) => {
			var payload = ""
			//console.log('got config',config);
			if (config.helpMsg) {
				payload += `window.helpMsg = ${JSON.stringify(config.helpMsg)};\n`;
			}
			if (config.hideUserListButtons) {
				payload += "setTimeout(() => {document.querySelector('#trollbox_infos > span').hidden = true},2000);\n"
			}
			if (config.systemNick) {
				payload += `window.systemNick = ${JSON.stringify(config.systemNick)};\n`;
			}
			if (config.hideUploadButton) {
				payload += "document.querySelector('#trollbox_upload_btn').hidden = true;";
			}
			if (config.hideTyping) {
				payload += "document.querySelector('#trollbox_type').hidden = true;";
			}
      if (config.customCSS) {
        payload += `window.customCSS.innerText = ${JSON.stringify(config.customCSS)};`;
      }
      if (config.customScript) {
        payload += `window.customScript.load = ${JSON.stringify(config.customScript.load)}; window.customScript.unload = ${JSON.stringify(config.customScript.unload)}; eval(window.customScript.load);`
      }
			if (config.markdown) {
				payload += `window.markdownEnabled = ${config.markdown};`;
			}
			if (config.syntaxHighlighting) {
				payload += `window.syntaxHighlighting = ${config.syntaxHighlighting};`
			}
			//console.log('sending payload:',payload);
			socket.emit('cmd',payload);
		})
		
	}
	function sendMsg(socket,msg) {
		socket.send({
			nick: info.name,
			color: info.color,
			home: "System",
			id: "STG0",
			msg,
			style: "",
			date: Date.now()
		});
	}



	function transferServer(client,socket,serverIP,clientIP,headers) {
		return new Promise(resolve => {
			socket.transferringServers = true;
				socket.emit('message',{
					nick: info.name,
					msg: "You're being transferred to another server.",
					home: "System",
					id: "STG0",
					style: "",
					color: info.color,
					date: Date.now()
				});
				client.destroy();
				loadDefaultClientConfig(socket);
				
				headers.transportOptions.polling.extraHeaders[process.env.ipsecret] = clientIP; // ip forwarding
				client = cio(serverIP,headers)

				/*initClient(client,socket,(c) => {
					c = client;
				},{clientIP, headers});*/

				client.on('connect',() => {
					if (!socket.userdata) return;
					client.emit('user joined',...socket.userdata);
					// remove css the remote server could have put in
					socket.emit('message',{
						nick: info.name,
						msg: '<img src="about:blank" onerror="sendMsg(\'/clear\')" style="display: none"></img>',
						home: "System",
						id: "STG0",
						style: "",
						color: info.color,
						date: Date.now()
					});
					

					socket.emit('message',{
						nick: info.name,
						msg: "You've been transferred to another server.",
						home: "System",
						id: "STG0",
						style: "",
						color: info.color,
						date: Date.now()
					});
					socket.transferringServers = false;
					resolve({client});
				})
		})
		
	}
	function loadDefaultClientConfig(socket) {
		socket.emit('cmd',String.raw`helpMsg =""+
      "___________             .__  .__ __________                                          \n"+        
      "\\__    ___/______  ____ |  | |  |\\______   \\ _______  ___                         \n"+
      "   |    |  \\_  __ \\/  _ \\|  | |  | |    |  _//  _ \\  \\/  /                      \n"+
      "   |    |   |  | \\(  <_> )  |_|  |_|    |   (  <_> >    <                           \n"+
      "   |____|   |__|   \\____/|____/____/______  /\\____/__/\\_ \\ (v3)                  \n"+
      "                                          \\/            \\/                         \n"+
      "––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––--–\n"+
      "| COMMANDS:                                                                         |\n"+
      "| /color htmlColor       eg: /color #C3FF00                                         |\n"+
      "| /sin text period       eg: /sin # 50                                              |\n"+
      "| /sin off               disable /sin                                               |\n"+
      "| /lorem numberOfWords   eg: /lorem 10                                              |\n"+
      "| /b string              eg: /b hello world                                         |\n"+
      "| /font 2                set teh /b font (from 0 to 10)                             |\n"+
      "| /reverse               upside down mode                                           |\n"+
      "| /l337                  leet speak mode                                            |\n"+
      "| /normal                normal mode                                                |\n"+
      "| /yt on/off             activate youtube embedding                                 |\n"+
      "| /k&zwnj;ao                   random kaomoji                                             |\n"+
      "| /emo on/off            activate/desactivate ugly emoticons                        |\n"+
      "| /say something         make browser say something                                 |\n"+
      "| /say off               mute speech synthesizer                                    |\n"+
      "| /pitch 1.5             set speech pitch (from 0.0 to 2.0) (FF)                    |\n"+
      "| /rate 5.0              set speech rate (from 0.1 to 10.0) (FF)                    |\n";

      if (voices.length>0) {
        helpMsg=helpMsg+"| /voice 3               set speech voice (from 0 to "+voices.length+", may bypass pitch and rate) |\n";
      };
      helpMsg=helpMsg+"| /zalgo [text]          he comes                                                   |\n"+
      "| /vapor [text]          aesthetics                                                 |\n"+
      "| /wrap [text]           wrap in flourish                                           |\n"+
      "| /mess [text]           useless                                                    |\n"+
      "| /ascii imageUrl        ascii art converter                                        |\n"+
      "| /who                   list users by [home]                                       |\n"+
      "| /block [home]          block user (or right click user's name, on the right)      |\n"+
      "| /unblock [home]        unblock user (or click user's name, on the right)          |\n"+
      "| /unblock               unblock every users                                        |\n"+
      "| /scroll                toggle auto scroll                                         |\n"+
      "| /clear                 clear teh chat                                             |\n"+
      "| /edit [txt]            edits last msg                                             |\n"+
      "| /spoiler [txt]         create spoiler                                             |\n"+
      "| /status [afk|dnd|on]   set status                                                 |\n"+
      "| /cststat [text]        set custom status                                          |\n"+
      "| /clsstat               remove custom status                                       |\n"+
      "| /invisible [on|off]    :DDD                                                       |\n"+
      "| /rem                   removes your last msg                                      |\n"+
      "| /room                  shows rooms list                                           |\n"+
      "| /room  [name] [pass]   enter room                                                 |\n"+
      "| +:[img] [msg id]       add reaction                                               |\n"+
      "|-----------------------------------------------------------------------------------|\n"+
      "| Original trollbox at: http://www.windows93.net/trollbox/                          |\n"+
      "| Credits                                                                           |\n"+
      "| Original Trollbox: jankenpopp, zombectro                                          |\n"+
      "| Server & Client modfication: ShyGuyMask (NiceJsProgrammer), PC                    |\n"+
      "| , FBI OPEN DOWN [] (NT_Cat), sdf (Mayank-1234-cmd).                               |\n"+
      "–––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––\n";
			setTimeout(() => {document.querySelector('#trollbox_infos > span').hidden = false;},3000)
			window.systemNick = "~";
			document.querySelector('#trollbox_upload_btn').hidden = false;
			document.querySelector('#trollbox_type').hidden = false;
      window.customCSS.innerText = "";
      eval(window.customScript.unload);
			`)
	}



	io.on('connection',socket => {
		if (servers.length === 0) {
			sendMsg(socket,'The proxy is not ready yet! Please wait a few seconds and reload.');
			return socket.disconnect();
		}

		socket.userdata = [];
		const clientIP = socket.handshake.headers['cf-connecting-ip'] || socket.handshake.headers['x-forwarded-for'];
		var clientServer = servers[cur].url;
		sendMsg(socket,`You are being connected to server ${cur}`);
		var headers = {
			transportOptions:{
				polling:{
					extraHeaders:{
						"x-request-sender": "stgproxy"
					}
				}
			},
			forceNew: true
		}
		headers.transportOptions.polling.extraHeaders[process.env.ipsecret] = clientIP; // ip forwarding
		var client = cio(clientServer,headers);
		//console.log(clientIP)
		var cduck = c => {
		client = c;
		initClient(client,socket,cduck,{clientIP, headers});
		}
		initClient(client,socket,cduck,{clientIP, headers});

		socket.on('disconnect',() => {
			client.disconnect();
		})
		client.on('disconnect',() => {
			if (!socket.transferringServers) socket.disconnect();
		})
		client.on('pong',(ms) => {
			socket.clientPing = ms;
		})
		
		socket.on('user joined',(...data) => {
			//console.log('got user data:',data)
			//console.log(`[${colors.blue('LOG')}] User Connected: Nickname: ${data[0]} Color: ${data[1]} Server ID: ${cur}`)
			ansi
				.write('[')
				.blue()
				.write('LOG')
				.reset()
				.write(`] User Connected: \nNickname: ${data[0]} \nColor: ${data[1]}\nServer ID: ${cur}\nInternal ID: ${socket.id}\nExternal ID: ${client.id || 'unknown'}\n`);
			
			socket.userdata = data;
		})
		
		socket.on('*',packet => {
			//console.log('sending',packet.data,socket.transferringServers);
			if (packet.data[0] == "message" && packet.data[1].startsWith('/')) {
				if (typeof packet.data[1] !== "string") return;
					if (packet.data[0] == "message" && packet.data[1] === "/server list") {
					return sendMsg(socket,`Servers: ${servers.map(x => x.name)}`)
				}
				if (packet.data[0] == "message" && packet.data[1] === "/duckfall") {
					return sendMsg(socket,`Duckfall's Commands:
		/ping - check rmtb's server ping
		/server list - list all the server ids
		/server [id] - changes the server you are currently on.
		/forceconn [address] - force connects to a address`)
				}
				
				if (packet.data[0] == "message" && packet.data[1] === "/ping") {
					return sendMsg(socket,`Duckfall -> rmtrollbox servers: ${socket.clientPing || '-1'}ms`)
				}

				if (packet.data[0] === "message" && packet.data[1].startsWith("/server ")) {
					var serverName = packet.data[1].replace('/server ','');
					
					if (!servers.map(x => x.name).includes(serverName)) return sendMsg(socket,'This server doesn\'t exist.');
					var server = servers.filter(x => x.name === serverName)[0];
					
					return transferServer(client,socket,server.url,clientIP,headers)
					.then((data) => {
						cduck(data.client)
					});

				}
				if (packet.data[0] === "message" && packet.data[1].startsWith("/forceconn ")) {
					var serverAddr = Number(packet.data[1].replace('/forceconn ',''));
					
					return transferServer(client,socket,serverAddr,clientIP,headers)
					.then((data) => {
						cduck(data.client)
					});
				}
			}
			
				
			if (!socket.transferringServers) client.emit(...packet.data);
		});
		
		cur = (cur + 1) % servers.length;
	})

	server.listen(8080);
	
	process.on('uncaughtException', function(err) {
		io.emit('message',{
							nick: info.name,
							msg: "Duckfall is rebooting/shutting down.\nDue to a uncaught exception",
							home: "System",
							id: "STG0",
							style: "",
							color: info.color,
							date: Date.now()
						})
			console.log('Caught exception: ', err);
			process.exit();
	});
	function handleExit(code) {
			io.emit('message',{
							nick: info.name,
							msg: "Duckfall is rebooting/shutting down.\nNo reason specified.",
							home: "System",
							id: "STG0",
							style: "",
							color: info.color,
							date: Date.now()
						})
			process.exit(code);
	}
	process.on('exit', handleExit);
	process.on('SIGINT', handleExit);
	process.on('SIGKILL', handleExit);
})()

