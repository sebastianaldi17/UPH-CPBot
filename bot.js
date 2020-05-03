const Discord = require('discord.js')
const request = require('request')

const client = new Discord.Client()

const api_cooldown = 5000
const prefix = "--"
const help = `Here are all the available commands:
-- cf: Shows upcoming Codeforces contests
-- help: displays all available commands
-- user: displays the user's information in Codeforces`

let cooling = false

function secondsToDHMS(seconds) {
    // Function made by https://stackoverflow.com/users/3564943/andris in https://stackoverflow.com/questions/36098913/convert-seconds-to-days-hours-minutes-and-seconds/52387803#52387803
    seconds = Number(seconds)
    var d = Math.floor(seconds / (3600 * 24))
    var h = Math.floor(seconds % (3600 * 24) / 3600)
    var m = Math.floor(seconds % 3600 / 60)
    var s = Math.floor(seconds % 60)

    var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : ""
    var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : ""
    var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : ""
    var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : ""
    return dDisplay + hDisplay + mDisplay + sDisplay
}

function checkContests() {
    let broadcast_channel = client.channels.cache.get(process.env.CHANNEL_ID)
    request('https://codeforces.com/api/contest.list', { json: true }, (err, res, body) => {
        if (err) { return console.log(err) }
        if (body.status != 'OK') {
            console.log("API Error (Codeforces side, may be down)")
        } else {
            body.result.filter(item => item.phase === 'BEFORE').sort((a, b) => a.startTimeSeconds - b.startTimeSeconds).forEach(element => {
                // Remind upcoming contests today
                if (Math.abs(element.relativeTimeSeconds) <= 60 * 60 * 24) {
                    let timer = Math.abs(element.relativeTimeSeconds) - 60 * 60
                    let date = new Date(element.startTimeSeconds * 1000)
                    if (timer < 0) {
                        broadcast_channel.send(`Upcoming contest: ${element.name} on ${date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })}\n`)
                    }
                    else {
                        console.log("Added timer for " + element.name)
                        setTimeout(() => { broadcast_channel.send(`Upcoming contest: ${element.name} on ${date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })}\n`) }, timer * 1000)
                    }
                }
            })
        }
    })
}

client.login(process.env.BOT_TOKEN)

client.on('ready', () => {
    console.log("CP Bot is now online")
    client.user.setActivity('your server. -- help for actions', { type: 'WATCHING' }).catch(console.error)
    checkContests()
    setInterval(checkContests, 1000 * 60 * 60 * 24)
})

client.on("message", (message) => {
    var content = message.content.split(' ')
    if (content.length > 0) {
        if (content[0] === prefix) {
            for (let i = 0; i < content.length; i++) {
                content[i] = content[i].toLowerCase()
            }
            // Check if valid command
            if (content[1] === "cf") {
                if (cooling) {
                    return message.reply("Please wait 5 seconds between commands!")
                }
                request('https://codeforces.com/api/contest.list', { json: true }, (err, res, body) => {
                    if (err) { return console.log(err) }
                    if (body.status != 'OK') {
                        message.reply("An error has occured, please try again later.")
                    } else {
                        result_string = "\n"
                        body.result.filter(item => item.phase === 'BEFORE').sort((a, b) => a.startTimeSeconds - b.startTimeSeconds).forEach(element => {
                            let date = new Date(element.startTimeSeconds * 1000)
                            result_string += `${element.name} in ${date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })} (approximately ${secondsToDHMS(Math.abs(element.relativeTimeSeconds))})\n`
                        })
                        message.reply(result_string)
                        cooling = true
                        setTimeout(() => { cooling = false }, api_cooldown)
                    }
                })
            } else if (content[1] === "user") {
                if (content.length < 3) return message.reply("Not enough arguments. Syntax: -- user <nickname>")
                else {
                    request(`https://codeforces.com/api/user.info?handles=${content[2]}`, { json: true }, (err, res, body) => {
                        if (err) { return console.log(err) }
                        if (body.status != 'OK') {
                            return message.reply(`An error has occured. Reason: ${body.comment}`)
                        } else {
                            if (body.result[0]) {
                                let date = new Date(body.result[0].lastOnlineTimeSeconds * 1000)
                                return message.reply(`User ${content[2]},\nRating: ${body.result[0].rating},\nLast online: ${date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })}`)
                            }
                        }
                    })
                }
            } else if (content[1] === "help") {
                return message.reply(help)
            }
        }
    }
})