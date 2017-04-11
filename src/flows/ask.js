'use strict'
const slack = require('slack')
const messageBuilder = require('slapp/src/message')

module.exports = (app) => {
	let slapp = app.slapp
	let smb = app.smb

	let lang_ask_question = require('../language/post_question/ask_question.json')
	let lang_ask_question_with_details = require('../language/post_question/ask_question_with_details.json')
	let lang_cancelled_question = require('../language/post_question/cancelled_question.json')
	let lang_add_details_question = require('../language/post_question/add_details_question.json')
	let lang_question_with_details = require('../language/post_question/question_with_details.json')
	let lang_question_without_details = require('../language/post_question/question_without_details.json')

	function slackAPI(token) {
		return new app.SlackWebClient(token);
	}

	slapp.command('/yolk', 'ask (.*) %%% (.*)', (msg, text, question, details) => {
		var state = {
			question: question,
			details: details
		}
		var response = lang_ask_question_with_details
		response.attachments[0].title = question
		response.attachments[0].callback_id = 'ask_callback'
		response.attachments[0].fields[0].value = '```' + details + '```'

		msg
			.respond(response)
			.route('ask_confirmation', state)

	})

	slapp.command('/yolk', 'ask (.*)', (msg, text, question) => {
		var state = {
			question: question,
			details: null
		}
		var response = lang_ask_question
		response.attachments[0].title = question
		response.attachments[0].callback_id = 'ask_callback'

		msg
			.respond(response)
			.route('ask_confirmation', state)
	})

	slapp.route('ask_confirmation', (msg, state) => {
		let answer = msg.body.actions[0].value

		if (answer === 'cancel') {
			var reply = lang_cancelled_question
			reply.attachments[0].title = state.question
			if (state.details !== null) {
				reply.attachments[0].fields[0].value = state.details
			}

			msg.respond(reply)
			return
		}
		
		else if (answer === 'details') {
			var reply = lang_add_details_question
			reply.attachments[0].title = 'Add details by typing this in the channel you wish to ask the question in'
			reply.attachments[0].fields[0].value = '```/yolk ask ' + state.question + ' %%% [YOUR_DETAILS_HERE]```'
			msg.respond(reply)
		} 
		
		else if (answer === 'post') {
			var userMention = '<@' + msg.body.user.name + '|' + msg.body.user.id + '>'
			var channelMention = '<!channel|channel>'

			if (state.details !== null) {
				var reply = lang_question_with_details
				reply.attachments[0].fields[0].value = state.details
			} else {
				var reply = lang_question_without_details
			}

			msg.respond({
				delete_original: true
			})

			reply.text = ''
			reply.attachments[0].title = 'Hey ' + channelMention + ', ' + userMention + ' has a question: \n ' + state.question
			reply.attachments[0].callback_id = 'ask_callback'
			reply.attachments[0].ts = Math.floor(new Date() / 1000)


			// Hack to thread the new reply
			var token = msg.meta.bot_token || msg.meta.app_token
			var slack = slackAPI(token)
			var channel_id = msg.meta.channel_id
			reply.username = 'yolk'
			reply.as_user = true


			// Post question in channel
			slack.chat.postMessage(channel_id, reply.text, reply, function (err, res) {
				if (err) {
					console.log('Error:', err)
					return
				}
				var response = res

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
					let ts = response.message.ts
					let questionUrl = 'https://' + msg.meta.team_domain + '.slack.com/archives/' + msg.meta.channel_id + '/' + 'p' + ts.slice(0,10) + ts.slice(11, ts.length)
					let text = 'Noticed you asked me to post a question: ' + questionUrl + '\n I\'ll keep you updated in here.'
					slack.chat.postMessage(imData.channel.id, text, {as_user: true}, function (err, res) {
						if (err) {
							console.log('Error linking question asked in DM', err)
							return
						}
					})
				})

				// Thread the question in the channel
				var data = {
					username: "yolk",
					as_user: "true",
					thread_ts: response.message.ts,
					reply_broadcast: true
				}

				slack.chat.postMessage(channel_id, 'Click me to answer!', data, function (err, res) {
					if (err) {
						console.log('Error:', err)
						return
					}
				});
			});

		}
	})

	slapp.action('ask_callback', 'answer', (msg, text) => {
		console.log(msg)
	})

	return {}
}

