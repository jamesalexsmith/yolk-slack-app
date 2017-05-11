'use strict'

module.exports = (app) => {
	let db = app.db
	let slapp = app.slapp
	let onboarding_message_builder = require('../services/onboarding_message_builder')(app)

	slapp.event('bb.team_added', function (msg) {
		msg.say('Hi, thanks for installing Yolk!\nIf you\'re ready to launch type `/yolk launch`')
		addTeam(msg)
		addUsers(msg)
	})

	slapp.command('/yolk', 'reinstall', (msg) => {
		addTeam(msg)
		addUsers(msg)
		msg.respond('Reinstalled Yolk!')
	})

	slapp.command('/yolk', 'launch', (msg) => {
		// Set launched to True and launch date in database
		let teamQuery = {team_id: msg.meta.team_id}
		let updateQuery = {$set: {'launched': true, 'launched_at': new Date()}}
		db.updateTeam(teamQuery, updateQuery)
		msg.say('Launching Yolk to the rest of your Slack!')

		startOnboardingUsers(msg)
	})

	function startOnboardingUsers(msg) {
		// Fetch all users
		let usersOptions = {token: msg.meta.bot_token}
		slapp.client.users.list(usersOptions, (err, usersData) => {
			if (err) {
				console.log('Error listing all users in launch flow', err)
				return
			}

			for (var i = 0; i < usersData.members.length; i++) {
				let user = usersData.members[i]

				if (! (user.is_bot || user.deleted)) {
					// Open IM with each user
					let imOptions = {
						token: msg.meta.bot_token,
						user: user.id
					}
					slapp.client.im.open(imOptions, (err, imData) => {
						if (err) {
							console.log('Error opening im with user for onboarding', err)
						}

						let google_auth_link = 'www.google.com' // TODO
						let onboarding_message = onboarding_message_builder.build(0, user.id, msg.meta.team_name, google_auth_link)

						// Display onboarding message
						let msgOptions = {
							token: msg.meta.bot_token,
							channel: imData.channel.id,
							text: onboarding_message.text,
							attachments: onboarding_message.attachments
						}

						slapp.client.chat.postMessage(msgOptions, (err, postData) => {
							if (err) {
								console.log('Error sending onboarding dm', err)
							}
						})
					})
				}
			}
		})
	}

	slapp.action('onboarding_callback', 'next', (msg, text) => {
		let meta_data = JSON.parse(msg.body.actions[0].value)
		let onboarding_message = onboarding_message_builder.build(parseInt(meta_data.index) + 1, meta_data.user_id, meta_data.company_name, meta_data.google_auth_link)
		msg.respond(msg.body.response_url, onboarding_message)
	})

	function addTeam(msg) {
		let teamContents = {
			team_name: msg.meta.team_name,
			team_id: msg.meta.team_id,
			paid: false,
			paid_at: null,
			launched: false,
			launched_at: null,
			added_at: new Date(),
		}
		// Will upsert if it doesn't exist
		db.updateTeam({team_id: msg.meta.team_id}, teamContents)
	}

	function addUsers(msg) {
		let usersOptions = {token: msg.meta.bot_token}
		slapp.client.users.list(usersOptions, (err, usersData) => {
			if (err) {
				console.log('Error listing all users in team added event', err)
				return
			}

			for (var i = 0; i < usersData.members.length; i++) {
				let user = usersData.members[i]
				if (! (user.is_bot || user.deleted)) {
					let userContents = {
						user_id: user.id,
						user_name: user.real_name,
						team_name: msg.meta.team_name,
						team_id: msg.meta.team_id,
						onboarded: false,
						onboarded_at: null,
						google_token: null
					}
					// Will upsert if it doesn't exist
					db.updateUser({team_id: msg.meta.team_id, user_id: user.id}, userContents)
				}
			}
		})
	}



	return {}
}