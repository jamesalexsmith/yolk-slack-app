'use strict'

module.exports = (app) => {
	let db = app.db
	let slapp = app.slapp
	let post_question_confirmation = require('../language/post_question/ask_question_confirmation.json')
	let lang_next_button = require('../language/search/next_button.json')
	let lang_prev_button = require('../language/search/prev_button.json')
	let lang_qa_pair = require('../language/search/qa_pair.json')
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

		db.Question.find({$text: {$search: text}, answered: true})
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
					let reply = formatResults(msg, paginations[0])
					// reply.attachments.push(generatePaginationNavigation(paginations, 0))
					msg.say(reply)
					console.log(reply)
					// console.log(paginations)
				}
			});

	})

	function startQuestionPostingFlow(msg, question) {
		let reply = post_question_confirmation
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
		return paginations
	}

	function formatResults(msg, pagination) {
		let results = lang_results
		let formatted_qa_pair = lang_qa_pair
		for (var i = 0; i < pagination.length; i++) {
			let qa_pair = pagination[i]
			formatted_qa_pair = lang_qa_pair
			formatted_qa_pair.title = 'Q: ' + qa_pair.question + '\nA: ' + qa_pair.latest_accepted_answer
			formatted_qa_pair.title_link = generateLinkToFirstComment(msg, qa_pair)
			formatted_qa_pair.footer = generateFooter(qa_pair.latest_accepted_user_id, qa_pair.answered_at)
			results.attachments.push(JSON.parse(JSON.stringify(formatted_qa_pair)))
		}
		console.log(results)
		return results
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

	function generateFooter(user_id, timestamp) {
		return 'Answered by <@' + user_id + '> on <!date^' + Math.floor(new Date(timestamp) / 1000) + '^{date_long} at {time}|' + Date(timestamp).toLocaleString() + '>'
	}


	function nextPageExists(paginatedQAMatches, pageIndex) {

	}

	function prevPageExists(paginatedQAMatches, pageIndex) {

	}

	function sendValidationData(msg, qaMatch) {
		// send thanks
	}

	function sendThanks(msg, qaMatch) {

	}

	return {}
}