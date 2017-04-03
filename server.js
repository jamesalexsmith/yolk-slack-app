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
var SlackWebClient = require('@slack/client').WebClient;

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

conn.once('open', function () {
	var app = {
		slapp,
		server,
		SlackWebClient,
		smb,
		mongoose
	}

	// Conversation flows
	require('./src/flows')(app)

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
});