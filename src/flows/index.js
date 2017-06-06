'use strict'

// list out explicitly to control order
module.exports = (app) => {
	app.flows = {
		help: require('./help')(app),
		import: require('./import')(app),
		ask: require('./ask')(app),
		team_events: require('./team_events')(app),
		message_dispatcher: require('./message_dispatcher')(app),
		search: require('./search')(app),
		answer: require('./answer')(app),
		authenticate: require('./authenticate')(app),
		export: require('./export')(app)
	}

	return app.flows
}