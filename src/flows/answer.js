'use strict'

module.exports = (app) => {
	let slapp = app.slapp
	var lang_select_answer = require('../language/answer/select_answer.json')
	var lang_accept_answer = require('../language/answer/accept_answer.json')
	var lang_navigate_answers = require('../language/answer/navigate_answers.json')
	var lang_next_button = require('../language/answer/next_button.json')
	var lang_previous_button = require('../language/answer/previous_button.json')
	var rp = require('request-promise')

	function getTimestampOfQuestion(link) {
		let string = link.match('\\/p[0-9]*').slice(-1)[0].substr(2)
		string = string.slice(0, -6) + '.' + string.slice(-6, string.length)
		return string
	}

	function getChannelNameOfQuestion(link) {
		return link.match('archives\\/(.*)\\/p[0-9]*')[1]
	}

	function getChannelIdByName(channels, channelName) {
		for (var i = 0; i < channels.length; i++) {
			if (channelName == channels[i].name) {
				return channels[i].id
			}
		}
	}

	function createPagination(threadedMessages) {
		let paginatedMessages = []

		for (var i = 0; i < threadedMessages.length; i += 3) {
			paginatedMessages.push(threadedMessages.slice(i, i + 3))
		}
		return paginatedMessages
	}

	function getNumReactions(reactions, reaction_type) {
		if (reactions === undefined) return 0
		for (var i = 0; i < reactions.length; i++) {
			if (reactions[i].name === reaction_type) {
				return reactions[i].count
			}
		}
		return 0
	}

	function formatAcceptAnswer(paginatedMessage) {
		let formattedAcceptAnswer = lang_accept_answer
		formattedAcceptAnswer.title = '<@' + paginatedMessage.user + '>'
		formattedAcceptAnswer.text = paginatedMessage.text
		if (paginatedMessage.attachments) formattedAcceptAnswer.attachments = paginatedMessage.attachments
		formattedAcceptAnswer.fields = [{
			"title": ':+1: ' + getNumReactions(paginatedMessage.reactions, '+1') + '   :-1: ' + getNumReactions(paginatedMessage.reactions, '-1')
		}]
		return formattedAcceptAnswer
	}

	function createFormattedPagination(pagination) {
		let answers = []
		pagination.forEach(function (paginatedMessage) {
			// Need to create a new instance
			answers.push(JSON.parse(JSON.stringify(formatAcceptAnswer(paginatedMessage))))
		}, this);
		return answers
	}

	function generateNavigationButtons(index, length) {
		let navigation = JSON.parse(JSON.stringify(lang_navigate_answers))
		if (index === 0) {
			navigation.actions.push(JSON.parse(JSON.stringify(lang_next_button)))
		} else if (index == length - 1) {
			navigation.actions.push(JSON.parse(JSON.stringify(lang_previous_button)))
		} else {
			navigation.actions.push(JSON.parse(JSON.stringify(lang_previous_button)))
			navigation.actions.push(JSON.parse(JSON.stringify(lang_next_button)))
		}

		return navigation
	}

	function generateFormattedPaginations(paginatedMessages) {
		let paginatedAnswers = []
		for (var i = 0; i < paginatedMessages.length; i++) {
			let formattedPagination = createFormattedPagination(paginatedMessages[i])
			formattedPagination.push(generateNavigationButtons(i, paginatedMessages.length))
			paginatedAnswers.push(formattedPagination)
			console.log(createFormattedPagination)
		}

		return paginatedAnswers
	}

	slapp.action('answers_callback', 'show', 'show', (msg, text) => {
		let channelName = getChannelNameOfQuestion(msg.body.original_message.attachments[0].title_link)

		slapp.client.channels.list({
			token: msg.meta.app_token
		}, (err, channelData) => {
			if (err) console.log('Error listing channels', err)

			let channelId = getChannelIdByName(channelData.channels, channelName)
			let repliesOptions = {
				method: 'GET',
				url: 'https://slack.com/api/channels.replies',
				qs: {
					token: msg.meta.app_token,
					channel: channelId,
					thread_ts: getTimestampOfQuestion(msg.body.original_message.attachments[0].title_link)
				},
				json: true
			}

			rp(repliesOptions)
				.then(function (body) {
					let threadedMessages = body.messages
					let paginatedMessages = createPagination(threadedMessages.slice(1, threadedMessages.length))
					let formattedPaginatedMessages = generateFormattedPaginations(paginatedMessages)
					let reply = lang_select_answer

					reply.attachments = formattedPaginatedMessages[0]

					var state = {
						"pagination_index": 0,
						"paginations": formattedPaginatedMessages,
						"threaded_messages": threadedMessages,
						"channel_name": channelName,
						"channel_id": channelId
					}

					msg
						.respond(reply)
						.route('process_notification', state)
				})
		})
	})

	slapp.route('process_notification', (msg, state) => {
		let option = msg.body.actions[0].value
		let reply = lang_select_answer
		reply.attachments = state.paginations[state.pagination_index]

		if (option === 'accept') {
			console.log('TODOOO')
			msg.route('process_notification', state)
		} else if (option === 'next') {
			reply.attachments = state.paginations[state.pagination_index + 1]
			state.pagination_index += 1
		} else if (option === 'previous') {
			reply.attachments = state.paginations[state.pagination_index - 1]
			state.pagination_index -= 1
		}

		msg
			.respond(reply)
			.route('process_notification', state)

	})

	function nextPage(msg, state) {

	}

	function acceptPage(msg, state) {

	}

	function acceptAnswer(msg, state) {

	}

	return {}
}