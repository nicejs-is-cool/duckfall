const express = require('express');
const router = express.Router();
const basicAuth = require('express-basic-auth')
const Database = require("@replit/database")
const db = new Database()


router.use(basicAuth({
	users: JSON.parse(process.env.users),
	challenge: true,
	realm: 'STgProxy-rmtrollbox'
}))
router.use(express.json());

router.use(express.static(__dirname+"/mgr_client"));

router.patch('/server',async (req,res) => {
	const index = Number(req.body.index);
	const name = req.body.name;
	const url = req.body.url;

	if (!index || !name || !url || isNaN(index)) res.status(400).send('Bad Request');
	
	var servers = await db.get('servers');
	if (index > (servers.length-1)) res.status(400).send('Bad Request');

	servers[index] = {name, url};
	await db.set('servers',servers);
	res.send('OK');
})

router.get('/servers',async (req,res) => {
	var servers = await db.get('servers');
	return res.json(servers);
})

router.post('/server',async (req,res) => {
	const { name, url } = req.body;
	var servers = await db.get('servers');
	if (!name || !url) return res.status(400).send('Bad Request');
	servers.push({name, url});
	await db.set('servers',servers);
	res.send('OK');
})

router.delete('/server/:index',async (req,res) => {
	const index = Number(req.params.index);
	var servers = await db.get('servers');
	if (!index || isNaN(index) || index > (servers.length-1)) return res.status(400).send('Bad Request');
	 
	servers.splice(index,1);
	await db.set('servers',servers);
	res.send('OK')
})


module.exports = router;