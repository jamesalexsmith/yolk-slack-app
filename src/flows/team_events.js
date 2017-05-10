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
	})

	return {}
}