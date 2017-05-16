'use strict'

const express = require('express')
const Slapp = require('slapp')
const ConvoStore = require('slapp-convo-beepboop')
const Context = require('slapp-context-beepboop')
const smb = require('slack-message-builder')
const mongoose = require('mongoose')

// use `PORT` env var on Beep Boop - default to 3000 locally
var port = process.env.PORT || 3000

var slapp = Slapp({
	// Beep Boop sets the SLACK_VERIFY_TOKEN env var
	verify_token: process.env.SLACK_VERIFY_TOKEN,
	convo_store: ConvoStore(),
	context: Context(),
	ignoreBots: false,
	ignoreSelf: false,
})

// attach Slapp to express server
var server = slapp.attachToExpress(express())
var SlackWebClient = require('@slack/client').WebClient

// Conect to mongodb
var options = {
	server: {
		socketOptions: {
			keepAlive: 300000,
			connectTimeoutMS: 30000
		}
	},
	replset: {
		socketOptions: {
			keepAlive: 300000,
			connectTimeoutMS: 30000
		}
	}
};

var mongodbUri = 'mongodb://admin:admin@ds149040.mlab.com:49040/staging'
mongoose.connect(mongodbUri, options)
var conn = mongoose.connection
conn.on('error', console.error.bind(console, 'connection error:'))

console.log('Connecting to MongoDB...')
conn.once('open', function () {
	console.log('Done connecting to MongoDB')
	// Create models and schemas
	const db = require('./src/services/database')(mongoose)
	
	var app = {
		slapp,
		server,
		SlackWebClient,
		smb,
		mongoose,
		db
	}
	let authentications = require('./src/authentications')(app)
	let flows = require('./src/flows')(app)

	app.flows = flows
	app.authentications = authentications

	db.getLaunchedTeamIDs().exec(function (err, launchedTeams) {
		console.log('Fetching teams that have launched...')
		if (err) {
			console.log('Error fetching teams that have launched')
		}

		// STATEFUL VARIABLES FOR OPTIMIZATION
		app.team_ids_launched = []
		for (var i = 0; i < launchedTeams.length; i++) {
			app.team_ids_launched.push(launchedTeams[i].team_id)
		}
		console.log('Done fetching teams that have launched:', app.team_ids_launched)


		server.get('/', function (req, res) {
			res.send('Hi, you\'ve reached the Yolk app servers.')
		})

		// start http server
		server.listen(port, (err) => {
			if (err) {
				return console.error(err)
			}

			console.log(`Listening on port ${port}`)
		})
	})
});