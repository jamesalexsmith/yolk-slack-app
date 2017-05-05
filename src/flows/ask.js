'use strict'
const slack = require('slack')
const messageBuilder = require('slapp/src/message')

module.exports = (app) => {
	let db = app.db
	let smb = app.smb
	let slapp = app.slapp

	let lang_choose_channel = require('../language/post_question/choose_channel.json')
	let lang_ask_question_confirmation = require('../language/post_question/ask_question_confirmation.json')
	let lang_cancelled_question = require('../language/post_question/cancelled_question.json')
	let lang_post_question = require('../language/post_question/post_question.json')
	let lang_notify_new_question = require('../language/notify_asker/new_question.json')

	function slackAPI(token) {
		return new app.SlackWebClient(token);
	}

	slapp.command('/yolk', 'ask (.*)', (msg, text, question) => {
		var state = {question: question}
		var reply = lang_ask_question_confirmation
		reply.attachments[0].title = question
		reply.attachments[0].callback_id = 'ask_callback'

		msg
			.respond(reply)
			.route('ask_confirmation', state)
	})

	slapp.route('ask_confirmation', (msg, state) => {
		let answer = msg.body.actions[0].value
		// If state was manually passed along
		if (state.answer) {
			answer = state.answer
		}

		if (answer === 'cancel') {
			var reply = lang_cancelled_question
			reply.attachments[0].title = state.question
			reply.text = '_Ok, not doing it. Whew that was close :cold_sweat:!_'
			msg.respond(reply)
			return
		}

		else if (answer === 'edit') {
			msg.respond('_No problem!_\n_Type_ `/yolk ask` _YOUR QUESTION_')
			return
		}

		else if (answer === 'post') {
			var userMention = '<@' + msg.body.user.id + '>'
			var channelMention = '<!channel|channel>'
			var reply = lang_post_question

			reply.text = ''
			reply.attachments[0].title = 'Hey ' + channelMention + ', ' + userMention + ' has a question: \n ' + state.question
			reply.attachments[0].ts = Math.floor(new Date() / 1000)

			// Hack to thread the new reply
			var token = msg.meta.bot_token || msg.meta.app_token
			var slack = slackAPI(token)
			var channel_id = msg.meta.channel_id
			if (state.channel_selected) {
				// If channel was passed with a selection use it instead
				channel_id = msg.body.actions[0].selected_options[0].value
			}

			// If channel is in an IM use a dropdown to ask which channel to post it into
			if (channel_id[0] === 'D') {
				reply = lang_choose_channel
				state.answer = 'post'
				state.channel_selected = true
				msg
					.respond(reply)
					.route('ask_confirmation', state)
				return
			}

			reply.username = 'yolk'
			reply.as_user = true

			// Post question in channel
			slack.chat.postMessage(channel_id, reply.text, reply, function (err, response) {
				if (err) {
					if (err.stack.slice(0, 21) === 'Error: not_in_channel') {
						let updatedResponse = msg.body.original_message
						updatedResponse.text = ':sweat_smile: _I can\'t post your question to that channel since I\'m not a part of that channel!_ \n_Can you invite me to it and try again?_ :pray:'
						msg
							.respond(updatedResponse)
							.route('ask_confirmation', state)
						return
					}
					console.log('Error posting question to channel', err)
					return
				}
				let question_ts = response.message.ts

				// Thread the question in the channel
				var data = {
					username: "yolk",
					thread_ts: question_ts,
					as_user: true
				}
				slack.chat.postMessage(channel_id, 'Lets get this conversation started!', data, function (err, res) {
					if (err) {
						console.log('Error posting hint to thread the question', err)
						return
					}
					let first_comment_ts = res.message.ts
					let first_comment_thread_ts = res.message.thread_ts

					// Post question in DM
					let imOptions = {
						token: msg.meta.bot_token,
						user: msg.meta.user_id
					}
					slapp.client.im.open(imOptions, (err, imData) => {
						if (err) {
							console.log('Error opening DM with user when asking question')
							return
						}
						let new_question = lang_notify_new_question
						new_question.text = '_Got it! Here\'s your question:_'
						new_question.attachments[0].title = state.question
						new_question.attachments[0].footer = '<!date^' + Math.floor(new Date() / 1000) + '^Asked {date_long} at {time}|Asked ' + new Date().toLocaleString() + '>'
						
						let msgOptions = {
							token: msg.meta.bot_token,
							channel: imData.channel.id,
							text: new_question.text,
							attachments: new_question.attachments
						}

						slapp.client.chat.postMessage(msgOptions, (err, postData) => {
							if (err) {
								console.log('Error notifying asker of new question', err)
								return
							}


							// Thread the mirrored question in the dm giving them hyper link to original question
							let questionUrl = 'https://' + msg.meta.team_domain + '.slack.com/archives/' + channel_id + '/p' + question_ts.replace('.','')
							questionUrl = generateLinkToFirstComment(msg, channel_id, first_comment_ts, first_comment_thread_ts)
							let dmThreadedMsgOptions = {
								token: msg.meta.bot_token,
								channel: imData.channel.id,
								text: 'If you would like to post your own answer click <' + questionUrl + '|here>!',
								thread_ts: postData.ts,
							}
							slapp.client.chat.postMessage(dmThreadedMsgOptions, (err, postData) => {
								if (err) {
									console.log('Error linking original question in mirrored dm', err)
									return
								}
							})
						})
					})
				})

				msg.respond({
					delete_original: true
				})

				// Post the contents into the database
				let contents = createQuestionModelContents(msg, channel_id, state.question, question_ts)
				db.saveQuestion(contents)
			})
		}
	})

	function createQuestionModelContents(msg, channel_id, question, timestamp) {
		return {
			question: question,
			comments: [],
			author_user_id: msg.meta.user_id,
			reactions: [],
			channel_id: channel_id,
			team_id: msg.meta.team_id,
			team_name: msg.meta.team_name,
			answered: false,
			timestamp: timestamp,
			date: new Date()
		}
	}

	function generateLinkToFirstComment(msg, channel_id, comment_ts, comment_thread_ts) {
		// format: https://yolkhq.slack.com/archives/C55GAHKK5/p1493910706621195?thread_ts=1493910701.618016&cid=C55GAHKK5
		let url = 'https://'
		let team_domain = msg.meta.team_domain
		let ts = comment_ts.replace('.', '')
		let thread_ts = comment_thread_ts.replace('.', '')

		url = url + team_domain + '.slack.com/archives/' + channel_id + '/p' + ts + '?thread_ts=' + thread_ts + '&cid=' + channel_id
		return url
	}

	return {}
}

