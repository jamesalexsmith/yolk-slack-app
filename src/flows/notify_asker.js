'use strict'

module.exports = function (app) {
    let slapp = app.slapp
    let rp = require('request-promise')
    let lang_notify_comment = require('../language/notify_asker/notify_comment.json')
    let lang_notify_asker_new_question = require('../language/notify_asker/new_question.json')

    function deleteFirstHelperMessage(msg, helperMessage) {
        let delete_request = {
            token: msg.meta.bot_token,
            ts: helperMessage.ts,
            channel: msg.body.event.channel
        }
        slapp.client.chat.delete(delete_request, (err, deleteData) => {
            if (err) {
                console.log('Error deleting helper message', err)
                return
            }
        })
    }

    function getUserIdFromMention(text) {
        return text.match('<@(.*)\\|(.*)>')[2]
    }

    function getTimestampWithoutDecimal(ts) {
        return ts.slice(0, 10) + ts.slice(11, ts.length)
    }

    function generateNotification(message, msg) {
        let notification = lang_notify_comment
        notification.attachments[0].title = msg.body.event.text
        notification.attachments[0].text = '<@' + message.user + '>'
        notification.attachments[0].actions[0].value = JSON.stringify(msg.body) // Pass along the message
        return notification
    }

    function getMessageFromThreadedMessage(msg, threadedMessages) {
        for (var i = 0; i < threadedMessages.length; i++) {
            if (msg.body.event.ts === threadedMessages[i].ts) {
                return threadedMessages[i]
            }
        }
    }

    function messageAsker(msg, asker_username, threadedMessages) {
        // Open DM with asker, find the linked question in DM history, add to that thread with answer button

        // Get user id mentioned in the parent message
        let user_id = getUserIdFromMention(threadedMessages[0].attachments[0].title)

        // Open IM with asker
        let imOptions = {
            token: msg.meta.bot_token,
            user: user_id
        }
        slapp.client.im.open(imOptions, (err, imData) => {
            if (err) {
                console.log('Error opening im with asker', err)
                return
            }

            let imSearchOptions = {
                token: msg.meta.bot_token,
                channel: imData.channel.id,
                latest: parseFloat(threadedMessages[0].ts) + 100,
                oldest: parseFloat(threadedMessages[0].ts) - 1
            }
            slapp.client.im.history(imSearchOptions, (err, imSearchData) => {
                if (err) {
                    console.log('Error fetching im history', err)
                    return
                }

                let currentMsgThreaded = getMessageFromThreadedMessage(msg, threadedMessages)
                let reply = generateNotification(currentMsgThreaded, msg)

                // TODO Search for message by text in imSearchData
                let dm_thread_ts = imSearchData.messages[imSearchData.messages.length - 1].ts

                // Link the message in the DM question thread
                let msgOptions = {
                    token: msg.meta.bot_token,
                    channel: imData.channel.id,
                    text: 'New comment',
                    attachments: reply.attachments,
                    thread_ts: dm_thread_ts,
                    as_user: true,
                    reply_broadcast: true
                }
                slapp.client.chat.postMessage(msgOptions, (err, data) => {
                    if (err) {
                        console.log('Error linking comment to im', err)
                        return
                    }
                })

                // If this is the first response:
                if (threadedMessages.length - 1 == 1) {
                    // Update the notification text
                    let notification = lang_notify_asker_new_question
                    notification.text = '_Someone commented! Click on the replies to see if we have your answer._'
                    notification.attachments = imSearchData.messages[imSearchData.messages.length - 1].attachments

                    let updateOptions = {
                        token: msg.meta.bot_token,
                        channel: imData.channel.id,
                        text: notification.text,
                        attachments: notification.attachments,
                        ts: dm_thread_ts
                    }
                    slapp.client.chat.update(updateOptions, (err, postData) => {
                        if (err) {
                            console.log('Error notifying asker of new question', err)
                            return
                        }
                    })

                    // If this is the second response:
                } else if (threadedMessages.length - 1 == 2) {
                    // Update the notification text
                    let notification = lang_notify_asker_new_question
                    notification.text = '_A few people have commented now. Click on the replies to see if we have your answer._'
                    notification.attachments = imSearchData.messages[imSearchData.messages.length - 1].attachments

                    let updateOptions = {
                        token: msg.meta.bot_token,
                        channel: imData.channel.id,
                        text: notification.text,
                        attachments: notification.attachments,
                        ts: dm_thread_ts
                    }
                    slapp.client.chat.update(updateOptions, (err, postData) => {
                        if (err) {
                            console.log('Error notifying asker of new question', err)
                            return
                        }
                    })
                }
            })
        })
    }

    function getAskerUsername(attachment) {
        return attachment.title.match('@(.+?(?=\\|))')[0].substr(1)
    }

    function getQuestionText(attachment) {
        return attachment.title.match('has a question: \\n(.*)')[1]
    }

    function initializeThumbsUpAndDown(msg) {
        // Add thumbs up and down to everything that's not our bot
        let reactionOptions = {
            token: msg.meta.bot_token,
            timestamp: msg.body.event.ts,
            name: '+1',
            channel: msg.body.event.channel
        }

        slapp.client.reactions.add(reactionOptions, (err) => {
            if (err) {
                console.log('Error adding reaction +1', err)
                return
            }

            let secondReactionOptions = {
                token: msg.meta.bot_token,
                timestamp: msg.body.event.ts,
                name: '-1',
                channel: msg.body.event.channel
            }

            slapp.client.reactions.add(secondReactionOptions, (err) => {
                if (err) {
                    console.log('Error adding reaction -1', err)
                    return
                }
            })
        })
    }

    return function (msg) {
        initializeThumbsUpAndDown(msg)

        // Need to use API directly since smallwins/slack is on version 7.5.*
        let repliesOptions = {
            method: 'GET',
            url: 'https://slack.com/api/channels.replies',
            qs: {
                token: msg.meta.app_token,
                channel: msg.body.event.channel,
                thread_ts: msg.body.event.thread_ts
            },
            json: true
        }

        rp(repliesOptions)
            .then(function (body) {
                let threadedMessages = body.messages

                // Delete first bot helper message if present
                if (msg.meta.bot_user_id === threadedMessages[1].user) {
                    deleteFirstHelperMessage(msg, threadedMessages[1])
                    threadedMessages.splice(1, 1)
                }

                let asker_username = getAskerUsername(threadedMessages[0].attachments[0])
                messageAsker(msg, asker_username, threadedMessages) // FOR TESTING
            })

            .catch(function (err) {
                console.log('Error getting threaded messages', err)
            })
    }
}