'use strict'

module.exports = (app) => {
	let db = app.db
	let slapp = app.slapp
	let post_question_confirmation = require('../language/post_question/ask_question_confirmation.json')

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
					console.log(paginations)
				}
			});

		// Found matches?
		// hyper link q&a threads
		// accept answer?
		// send thanks
		// upload data to DB validating q&a
		// return
		// next page? // TODO confidence score
		// loop back
		// Post question?
		// post the question
		// return
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