const tFunctions = {};
function createServerHTML(name,url,index,callback) {
	let serverDiv = document.createElement('div');
	serverDiv.className = "server";
	let serverNameInput = document.createElement('input');
	serverNameInput.placeholder = "Server Name";
	serverNameInput.value = name;
	serverNameInput.id = "server-name";
	let serverURLInput = document.createElement('input');
	serverURLInput.placeholder = "Server URL";
	serverURLInput.value = url;
	serverURLInput.id = "server-url";
	let serverApplyBtn = document.createElement('button');
	serverApplyBtn.innerText = "Apply Changes";
	let serverDelBtn = document.createElement('button');
	serverDelBtn.innerText = "Delete";
	
	const functionID = Math.random().toString(36).slice(2);
	tFunctions[functionID] = (el,type) => {
		
		var name = el.parentElement.querySelector('#server-name').value;
		var url = el.parentElement.querySelector('#server-url').value;
		
		callback(index,name,url,type);
	}
	serverApplyBtn.setAttribute('onclick', `tFunctions[${JSON.stringify(functionID)}](this,"patch")`)
	serverDelBtn.setAttribute('onclick', `tFunctions[${JSON.stringify(functionID)}](this,"delete")`)
	
	let newline = document.createElement('br');

	serverDiv.appendChild(serverNameInput);
	serverDiv.appendChild(serverURLInput);
	serverDiv.appendChild(serverApplyBtn);
	serverDiv.appendChild(serverDelBtn);
	
	serverDiv.appendChild(newline);
	
	document.querySelector('#serverlist').appendChild(serverDiv);

}
(async () => {
	async function updateServerList() {
		document.querySelector('#serverlist').innerHTML = "Loading...";
		var servers = (await axios.get('./servers')).data;
		document.querySelector('#serverlist').innerHTML = "";
		console.log('Updating server list...')
		//console.log(servers)
		for (var i = 0; i < servers.length; i++) {
			let server = servers[i]
			console.table(server)
			createServerHTML(server.name,server.url,i,async (index,name,url,type) => {
				if (type === "patch") {
					await axios.patch('./server',{
						index,
						name,
						url
					})
					alert('Successfully applied changes.\nIt will take about 5 minutes for the changes to take effect');
				}
				if (type === "delete") {
					await axios.delete(`./server/${index}`)
					alert('Successfully deleted server.\nIt will take about 5 minutes for the changes to take effect')
				}
				await updateServerList();
			})
		}
	}
	updateServerList();
	const addServer = document.querySelector('#add-new-server')
	
	addServer.onclick = async function() {
		const name = document.querySelector('#add-server > #server-name');
		const url = document.querySelector('#add-server > #server-url');
		
		await axios.post('./server',{
			name: name.value,
			url: url.value
		});
		
		name.value = "";
		url.value = "";
		await updateServerList();
		alert('New server created');

	}
})()