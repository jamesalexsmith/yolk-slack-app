'use strict'

module.exports = (app) => {
	let db = app.db
	let slapp = app.slapp
	let regex = '!Question!: (.*) !Answer!: (.*) !Channel!: (.*)'

	function createQuestionModelContents(question, answer, team_id, team_name, bot_user_id, channel_id) {
		return {
			question: question,
			comments: [{
				comment: answer,
				user_id: bot_user_id,
				accepted: true,
				accepted_at: new Date(),
				timestamp: new Date().getTime(),
				date: new Date()
			}],
			author_user_id: bot_user_id,
			reactions: [],
			channel_id: channel_id,
			team_id: team_id,
			team_name: team_name,
			answered: true,
			answered_at: new Date(),
			timestamp: new Date().getTime(),
			latest_accepted_user_id: bot_user_id,
			latest_accepted_answer: answer,
			date: new Date()
		}
	}

    slapp.message('yolk import !Question!: (.*) !Answer!: (.*) !Channel!: (.*)', ['direct_message'], (msg, text, question, answer, channel) => {
		let team_id = msg.body.team_id
		let team_name = msg.meta.team_name
		let bot_user_id = msg.meta.bot_user_id

		slapp.client.channels.list({token: msg.meta.bot_token}, (err, data) => {
			if (err) {
				console.log('Error fetching channels list in import', data)
				msg.respond('Can\'t list channels for this slack...')
				return
			}

			for (var i = 0; i < data.channels.length; i++) {
				if (channel == data.channels[i].name) {
					let channel_id = data.channels[i].id
					let contents = createQuestionModelContents(question, answer, team_id, team_name, bot_user_id, channel_id)
					db.saveQuestion(contents)

					msg.say('>Q: ' + question + '\n>A: ' + answer + '\n _Saved to DB in channel: <#' + channel_id + '>_')
					return
				}	
			}
			msg.say('_Could not find the channel, please type it again correctly..._')
		})

	})

	// slapp.event('file_shared', function (msg) {
	// 	let fileOptions = {
	// 		token: msg.meta.bot_token,
	// 		file: msg.body.event.file.id
	// 	}

	// 	slapp.client.files.info(fileOptions, (err, fileData) => {
	// 		if (err) {
	// 			console.log('Error fetching file in import', err)
	// 			return
	// 		}

	// 		console.log(fileOptions)
	// 		let csv = fileData.content
	// 	})
	// })


	return {}
}