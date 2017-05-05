'use strict'

module.exports = (app) => {
	let db = app.db
	let slapp = app.slapp
	let post_question_confirmation = require('../language/post_question/ask_question_confirmation.json')
	let lang_next_button = require('../language/search/next_button.json')
	let lang_prev_button = require('../language/search/prev_button.json')
	let lang_dismiss_button = require('../language/search/dismiss_button.json')
	let lang_question_button = require('../language/search/question_button.json')
	let lang_qa_pair = require('../language/search/qa_pair.json')
	let lang_pagination = require('../language/search/pagination.json')
	let lang_results = require('../language/search/results.json')

	slapp.command('/yolk', '(search)', (msg, text) => {
		console.log('search', msg)
		msg.respond('Searching.')
	})

	slapp.message('(.*)', ['direct_message'], (msg, text) => {
		if (text === 'help') {
			return {}
		} else if (text.startsWith('Noticed you asked me to post a ')) {
			return {}
		} else if (msg.body.event.thread_ts) { // In a thread
			return {}
		}

		startSearchFlow(msg, text)
	})

	function startSearchFlow(msg, question, ephemeral=false, response_url=null) {
		db.getQAPairs(msg.meta.team_id, question)
			// TODO ORDER BY RELEVANCE
			.limit(9)
			.exec(function (err, docs) {
				if (err) {
					console.log('Error search question models', err)
					return
				}
				if (docs.length == 0) {
					// No results in Yolk
					startQuestionPostingFlow('_I couldn\'t find an answer to your question, would you like to post it in Slack?_', msg, question)

				} else {
					// Found already matched Q&A pairs
					let paginations = paginateMatches(docs)
					let reply = formatResults(msg, paginations, 0)

					let state = {
						'question': question,
						'reply': reply,
						'paginations': paginations,
						'index': 0,
						'ephemeral': ephemeral,
						'sniffer_response_url': response_url
					}

					if (ephemeral) {
						// Need to respond with a new message
						reply.replace_original = false
						msg.respond(response_url, reply)
					} else {
						msg.say(reply)
					}

					msg.route('search_flow', state)
				}
			})
	}

	slapp.route('search_flow', (msg, state) => {
		let answer = msg.body.actions[0].name

		if (answer === 'next') {
			state.index += 1
			let reply = formatResults(msg, state.paginations, state.index)
			msg
				.respond(reply)
				.route('search_flow', state)
		} 
		
		else if (answer === 'previous') {
			state.index -= 1
			let reply = formatResults(msg, state.paginations, state.index)
			msg
				.respond(reply)
				.route('search_flow', state)
		} 
		
		else if (answer === 'validate') {
			msg.respond('I\'m glad to have helped, I\'ll send along the thanks! :smile:')
			let meta_data = JSON.parse(msg.body.actions[0].value)
			let qa_pair_index = meta_data.qa_pair_index
			let asker_user_id = meta_data.asker_user_id
			let answerer_user_id = meta_data.answerer_user_id

			// If the search flow started ephemerally from a sniff original_message isn't passed by slack
			let qa_pair = false
			if (!state.ephemeral) {
				qa_pair = msg.body.original_message.attachments[qa_pair_index]
			}
			sendThanks(msg, qa_pair, asker_user_id, answerer_user_id)
		} 
		
		else if (answer === 'question') {
			let response_url = msg.body.response_url

			msg.respond(response_url, {
				text: '',
				delete_original: true,
			})
			startQuestionPostingFlow('_Would you like me to ask this question for you?_', msg, state.question, state.ephemeral, state.sniffer_response_url)
		} 
		
		else if (answer === 'dismiss') {
			msg.respond(msg.body.response_url, {
				text: 'Sorry I couldn\'t be of help to you. :disappointed:',
				replace_original: true,
			})
		}
	})

	function startQuestionPostingFlow(text, msg, question, ephemeral=false, response_url=null) {
		let reply = JSON.parse(JSON.stringify(post_question_confirmation))
		let state = {
			question: question
		}
		reply.text = text
		reply.attachments[0].title = question
		reply.attachments[0].callback_id = 'ask_callback'

		if (ephemeral) {
			reply.replace_original = false
			msg.respond(response_url, reply)
		} else {
			msg.say(reply)
		}

		msg.route('ask_confirmation', state)
	}

	function paginateMatches(qaMatches, paginationLength = 3) {
		let paginations = []
		for (var i = paginationLength; i - paginationLength < qaMatches.length; i += paginationLength) {
			paginations.push(qaMatches.slice(i - paginationLength, i))
		}
		return JSON.parse(JSON.stringify(paginations))
	}

	function formatPagination(msg, page) {
		// Render all the qa pairs in the pagination
		let formatted_pagination = []
		let formatted_qa_pair = JSON.parse(JSON.stringify(lang_qa_pair))
		for (var i = 0; i < page.length; i++) {
			let qa_pair = page[i]
			formatted_qa_pair = JSON.parse(JSON.stringify(lang_qa_pair))
			formatted_qa_pair.title = 'Q: ' + qa_pair.question + '\nA: ' + qa_pair.latest_accepted_answer
			formatted_qa_pair.title_link = generateLinkToFirstComment(msg, qa_pair)
			formatted_qa_pair.footer = generateFooter(qa_pair.author_user_id, qa_pair.latest_accepted_user_id, qa_pair.answered_at)
			// Pass along meta data for 
			formatted_qa_pair.actions[0].value = JSON.stringify({
				'qa_pair_index': i,
				'asker_user_id': qa_pair.author_user_id,
				'answerer_user_id': qa_pair.latest_accepted_user_id
			})
			formatted_pagination.push(JSON.parse(JSON.stringify(formatted_qa_pair)))
		}
		return JSON.parse(JSON.stringify(formatted_pagination))
	}

	function formatResults(msg, paginations, pagination_index) {
		// For each paginatation format their qa pairs
		let formattedPaginations = []
		for (var i = 0; i < paginations.length; i++) {
			formattedPaginations.push(formatPagination(msg, paginations[i]))
		}

		let results = JSON.parse(JSON.stringify(lang_results))
		results.attachments = formattedPaginations[pagination_index]
		results.attachments.push(generatePaginationNavigation(paginations, pagination_index))
		return JSON.parse(JSON.stringify(results))
	}

	function generateLinkToFirstComment(msg, qa_pair) {
		// format: https://yolkhq.slack.com/archives/C55GAHKK5/p1493910706621195?thread_ts=1493910701.618016&cid=C55GAHKK5
		let url = 'https://'
		let team_domain = msg.meta.team_domain
		let qa_channel_id = qa_pair.channel_id
		let ts = qa_pair.comments[0].timestamp.replace('.', '')
		let thread_ts = qa_pair.timestamp.replace('.', '')

		url = url + team_domain + '.slack.com/archives/' + qa_channel_id + '/p' + ts + '?thread_ts=' + thread_ts + '&cid=' + qa_channel_id
		return url
	}

	function generateFooter(asker_user_id, user_id, timestamp) {
		return 'Asked by <@' + asker_user_id + '> and answered by <@' + user_id + '> on <!date^' + Math.floor(new Date(timestamp) / 1000) + '^{date_long} at {time}|' + Date(timestamp).toLocaleString() + '>'
	}

	function generatePaginationNavigation(paginations, index) {
		let pagination = JSON.parse(JSON.stringify(lang_pagination))
		if (paginations.length - 1 > index && index > 0) {
			// show next button and previous button
			pagination.actions.push(JSON.parse(JSON.stringify(lang_prev_button)))
			pagination.actions.push(JSON.parse(JSON.stringify(lang_next_button)))
		} else if (paginations.length - 1 > index) {
			// show next button
			pagination.actions.push(JSON.parse(JSON.stringify(lang_next_button)))
		} else if (index > 0) {
			// show previous button
			pagination.actions.push(JSON.parse(JSON.stringify(lang_prev_button)))
		}

		pagination.actions.push(JSON.parse(JSON.stringify(lang_dismiss_button)))
		pagination.actions.push(JSON.parse(JSON.stringify(lang_question_button)))

		return JSON.parse(JSON.stringify(pagination))
	}

	function sendThanks(msg, qa_pair, asker_user_id, answerer_user_id) {
		// qa_pair could be null if it is ephemeral

		//
		if (msg.meta.user_id != asker_user_id && msg.meta.user_id != answerer_user_id && asker_user_id == answerer_user_id) {
			let thanks_msg = 'Hey <@' + asker_user_id + '>, <@' + msg.meta.user_id + '> found your question and answer useful! Thanks for helping out.'
			if (qa_pair) {
				thanks_msg += '\n>>>' + qa_pair.title
			}
			sendDM(msg, asker_user_id, {text: thanks_msg})
			return
		}

		if (msg.meta.user_id != asker_user_id) {
			let asker_thanks = 'Hey <@' + asker_user_id + '>, <@' + msg.meta.user_id + '> found your question useful! Thanks for helping out.'
			if (qa_pair) {
				asker_thanks += '\n>>>' + qa_pair.title
			}
			sendDM(msg, asker_user_id, {text: asker_thanks})
		}

		if (msg.meta.user_id != answerer_user_id) {
			let answerer_thanks = 'Hey <@' + answerer_user_id + '>, <@' + msg.meta.user_id + '> found your answer useful! Thanks for helping out.'
			if (qa_pair) {
				answerer_thanks += '\n>>>' + qa_pair.title
			}
			sendDM(msg, answerer_user_id, {text: answerer_thanks})
		}
	}

	function sendDM(msg, user_id, reply) {
		// Open IM with user
		let imOptions = {
			token: msg.meta.bot_token,
			user: user_id
		}
		slapp.client.im.open(imOptions, (err, imData) => {
			if (err) {
				console.log('Error opening im with user for thanks in search', err)
				return
			}
			let msgOptions = {
				token: msg.meta.bot_token,
				channel: imData.channel.id,
				text: reply.text
			}

			slapp.client.chat.postMessage(msgOptions, (err, postData) => {
				if (err) {
					console.log('Error sending thanks in search', err)
				}
			})
		})
	}

	let methods = {}
	methods.startSearchFlow = startSearchFlow

	return methods
}