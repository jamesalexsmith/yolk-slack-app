'use strict'

module.exports = (app) => {
	let db = app.db
	let slapp = app.slapp

	slapp.event('bb.team_added', function (msg) {
		let teamContents = {
			team_name: msg.meta.team_name,
			team_id: msg.meta.team_id,
			paid: false,
			paid_at: null,
			launched: false,
			launched_at: null,
			added_at: new Date(),
		}

		db.saveTeam(teamContents)
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

						// Display onboarding message
						let msgOptions = {
							token: msg.meta.bot_token,
							channel: imData.channel.id,
							text: "THIS IS A LAUNCH TEST"
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

	return {}
}