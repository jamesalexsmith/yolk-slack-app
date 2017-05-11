'use strict'

module.exports = (app) => {
    let lang_onboarding_message = require('../language/launch/onboarding.json')

    function build(index, user_id, company_name, google_auth_link) {
        let indexable_replies = generatePaginatedReplies(user_id, company_name, google_auth_link)
        let reply = JSON.parse(JSON.stringify(indexable_replies[index]))

        if (reply.attachments[0]) { // If this isn't the last message
            reply.attachments[0].actions[0].value = JSON.stringify({
                index: index,
                user_id: user_id,
                company_name: company_name,
                google_auth_link: google_auth_link
            })
        }
        return JSON.parse(JSON.stringify(reply))
    }

    function generatePaginatedReplies(user_id, company_name, google_auth_link) {
        let replies = []
        replies.push(first_message(user_id, company_name))
        replies.push(second_message(company_name))
        replies.push(third_message(google_auth_link))
        replies.push(fourth_message())
        replies.push(fifth_message())
        replies.push(sixth_message())
        replies.push(seventh_message())
        replies.push(eigth_message())
        return replies
    }

    function first_message(user_id, company_name) {
        let reply = JSON.parse(JSON.stringify(lang_onboarding_message))
        let text = "Hey <@" + user_id + ">, I’m YOLK!\n\n"
        text += "I’m now your go-to for all team knowledge! No need to bother your teammates or waste time trying to find answers.:vertical_traffic_light::smile:\n\n"
        text += "I connect with all your Google Drive contents and keep tabs on your everyday Slack conversations so I know " + company_name + " inside and out!"
        reply.attachments[0].text = text
        reply.attachments[0].actions[0].text = "Awesome!"
        return reply
    }

    function second_message(company_name) {
        let reply = JSON.parse(JSON.stringify(lang_onboarding_message))
        let text = "So, how do I work?\n\n"
        text += "Just ask me a question about " + company_name + " right here in our DM, or in a public channel with `/yolk`.\n\n"
        text += "Examples:\n\n```where's the product FAQ sheet?```\n\nOr:\n\nIf in a channel\n\n```/yolk where is the objection handling doc?```\n\n"
        text += "Or this:\n\n```how do we troubleshoot a server issue```\n\nOr even this!\n\n```where is the industry case study?```"
        reply.attachments[0].text = text
        reply.attachments[0].actions[0].text = "Cool!"
        return reply
    }

    function third_message(google_auth_link) {
        let reply = JSON.parse(JSON.stringify(lang_onboarding_message))
        let text = "Let’s give it a go!\n\nFirst, I need you to connect me with your Google Drive:\n\n"
        text += "<" + google_auth_link + "|Connect to Google>"
        reply.attachments[0].text = text
        reply.attachments[0].actions[0].text = "Done!"
        return reply
    }

    function fourth_message() {
        let reply = JSON.parse(JSON.stringify(lang_onboarding_message))
        let text = "Thanks!\n\nNow, ask me a question.\n\n```Eg. Who is our competition?```"
        reply.attachments[0].text = text
        reply.attachments[0].actions[0].text = "I'll try it out!"
        return reply
    }

    function fifth_message() {
        let reply = JSON.parse(JSON.stringify(lang_onboarding_message))
        let text = "See? Easy as pie.\n\nIf I can’t find an answer, I’ll help you ask the right people and store the answer forever to help other teammates."
        reply.attachments[0].text = text
        reply.attachments[0].actions[0].text = "Cool!"
        return reply
    }

    function sixth_message() {
        let reply = JSON.parse(JSON.stringify(lang_onboarding_message))
        let text = "Oh, one more thing - I hate channel spam just as much as you. That’s why I keep our conversations visible only to ourselves. No need to distract your teammates :smile:"
        reply.attachments[0].text = text
        reply.attachments[0].actions[0].text = "Thanks!"
        return reply
    }

    function seventh_message() {
        let reply = JSON.parse(JSON.stringify(lang_onboarding_message))
        let text = "Okay, we’re set! If you need any more help, just type `help` in this DM :fire_engine:"
        reply.attachments[0].text = text
        reply.attachments[0].actions[0].text = "Got it!"
        return reply
    }

    function eigth_message() {
        let text = "Let’s crush this week together! :rocket:"
        return {text: text, attachments: []}
    }

    var methods = {}
    methods.build = build
    return methods
}