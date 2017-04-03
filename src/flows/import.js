'use strict'

module.exports = (app) => {
	let slapp = app.slapp
	let mongoose = app.mongoose

	slapp.message('(import) <(.*)>', ['direct_message'], (msg, text) => {		// let question = new questionSchema({ name: msg})
		let link = text.slice(8, text.length - 1)
		console.log('here', link)
		console.log(mongoose)
		// Load csv
		// Parse meta data
		// 
	})


	return {}
}