'use strict'

// list out explicitly to control order
module.exports = (app) => {
	app.flows = {
		help: require('./help')(app),
		ask: require('./ask')(app),
		search: require('./search')(app),
		export: require('./export')(app),
		answer: require('./answer')(app),
		message_dispatcher: require('./message_dispatcher')(app)
	}
}