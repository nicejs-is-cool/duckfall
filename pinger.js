const {
 parentPort, workerData
} = require('worker_threads');
const colors = require('colors/safe');
const axios = require('axios');

async function ping() {
	console.log(`[${colors.blue("...")}] Pinging...`)
	var working = [];
	for (var i = 0; i < workerData.length; i++) {
		let server = workerData[i]
		await axios.get(server.url,{
			headers: {
				"x-request-sender": "stgproxy-online-test"
			}
		}).then(_ => {
			if (_.data.includes('/socket.io.js')) {
				console.log(`[ ${colors.green("✔")} ] Server ${i} is online!`)
				working.push(server);
			} else {
				console.log(`[${colors.red("❌")} ] Server ${i} is offline.`)
			}
			
		}).catch(_ => {
			console.log(`[${colors.red("❌")} ] Server ${i} is offline.`)
		});

	}
	//console.log(`[${colors.blue("...")}] Posting new data...`);
	parentPort.postMessage(working);

}

setInterval(ping,60000)
// initial ping
ping();
