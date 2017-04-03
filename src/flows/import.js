'use strict'

module.exports = (app) => {
	let slapp = app.slapp
	let mongoose = app.mongoose

	slapp.message('(import) <(.*)>', ['direct_message'], (msg, text) => {
		let link = text.slice(8, text.length - 1)
		console.log('here', link)
		console.log(mongoose)
	})

	slapp.event('file_shared', function (msg) {
		let fileOptions = {
			token: msg.meta.bot_token,
			file: msg.body.event.file.id
		}

		slapp.client.files.info(fileOptions, (err, fileData) => {
			if (err) {
				console.log('Error fetching file in import', err)
				return
			}

			let csv = fileData.content
		})
	})


	return {}
}