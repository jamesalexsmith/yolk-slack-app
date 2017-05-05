'use strict'

module.exports = (app) => {
	let db = app.db
	let slapp = app.slapp
	let post_question_confirmation = require('../language/post_question/ask_question_confirmation.json')
	let lang_next_button = require('../language/search/next_button.json')
	let lang_prev_button = require('../language/search/prev_button.json')
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

		let searchQuery = {
			team_id: msg.meta.team_id,
			$text: {$search: text},
			answered: true
		}

		db.Question.find(searchQuery)
			// TODO ORDER BY RELEVANCE
			.limit(9)
			.exec(function (err, docs) {
				if (err) {
					console.log('Error search question models', err)
					return
				}
				if (docs.length == 0) {
					// No results in Yolk
					startQuestionPostingFlow(msg, text)

				} else {
					// Found already matched Q&A pairs
					let paginations = paginateMatches(docs)
					let reply = formatResults(msg, paginations, 0)
					
					let state = {
						'reply': reply,
						'paginations': paginations,
						'index': 0,
					}

					msg
						.say(reply)
						.route('search_flow', state)
				}
			});

	})

	function startQuestionPostingFlow(msg, question) {
		let reply = JSON.parse(JSON.stringify(post_question_confirmation))
		let state = {question: question}
		reply.text = '_I couldn\'t find an answer to your question, would you like to post it in Slack?_'
		reply.attachments[0].title = question
		reply.attachments[0].callback_id = 'ask_callback'

		msg
			.say(reply)
			.route('ask_confirmation', state)
	}

	function paginateMatches(qaMatches, paginationLength=3) {
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
			console.log('HERE1')
		}
		else if (paginations.length - 1 > index) {
			// show next button
			pagination.actions.push(JSON.parse(JSON.stringify(lang_next_button)))
			console.log('HERE2')
		}
		else if (index > 0) {
			// show previous button
			pagination.actions.push(JSON.parse(JSON.stringify(lang_prev_button)))
			console.log('HERE3')
		}

		return JSON.parse(JSON.stringify(pagination))
	}

	function sendThanks(msg, qaMatch) {

	}

	return {}
}