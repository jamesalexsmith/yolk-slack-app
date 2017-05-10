'use strict'

module.exports = (app) => {
  let db = app.db
  let slapp = app.slapp

  slapp.event('bb.team_added', function (msg) {
    let teamContents = {
        team_name: msg.meta.team_name,
        team_id: msg.meta.team_id,
        paid: false,
        paid_at: null,
        launched: false,
        launched_at: null,
        added_at: Date(),
    }
    
    db.saveTeam(teamContents)
  })

  return {}
}

