require('dotenv').config();
const axios = require('axios');
const CronJob = require('cron').CronJob;
const Discord = require('discord.js');
const { MessageEmbed } = require('discord.js');
const JSONdb = require('simple-json-db');
const db = new JSONdb(__dirname + '/storage.json');

const client = new Discord.Client({ intents: ['GUILDS', 'GUILD_MESSAGES'] }); 

// logs in console when bot is ready
client.once('ready', () => {
    console.log('Trivia For The Day Bot is ready');
})

// where there's a message receive and it is equals to the condition, send message pong!
client.on('message', message => {   
    // trivia for today
    let answer = db.get('trivia')['correct_answer']; 
    let incorrect_answer = db.get('trivia')['incorrect_answers'];
    let question = db.get('trivia')['question'];
    let type = db.get('trivia')['type'] == "boolean" ? "True/False" : "Multiple Choice";
    let category = db.get('trivia')['category'];
    let difficulty = db.get('trivia')['difficulty'];
    
    const exampleEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(question)
        .addFields(
            { name: 'Type', value: type, inline: true },
            { name: 'Category', value: category, inline: true },
            { name: 'Difficulty', value: difficulty, inline: true },
        )

    
    if (db.get('trivia')['type'] == "multiple") {
        let choices = incorrect_answer;
        choices.push(answer);

        function fisherYatesShuffle(arr){
            for(var i =arr.length-1 ; i>0 ;i--){
                var j = Math.floor( Math.random() * (i + 1) ); //random index
                [arr[i],arr[j]]=[arr[j],arr[i]]; // swap
            }
        }
        
        fisherYatesShuffle(choices);

        exampleEmbed.addField('Take note!', 'Please answer the value, not the choice.', false);
        exampleEmbed.addFields(
            { name: 'A', value: choices[0], inline: true },
            { name: 'B', value: choices[1], inline: true },
            { name: 'C', value: choices[2], inline: true },
            { name: 'D', value: choices[3], inline: true },
        )
    }

    // Getting of current trivia
    if (message.content === "!trivia") {
        // Send trivia to discord
        client.channels.cache.get(process.env.CHANNEL_ID).send({ embeds: [exampleEmbed] });
    }

    // Checking if message being sent is equals to the correct answer
    // Make answer and message lowercase
    if (message.content.toLowerCase() === answer.toLowerCase()) {
        console.log('YOU GOT THE CORRECT ANSWER');
    }
})

client.login(process.env.DISC_TOKEN);

// UPDATE FOR 8 AM PARAMETERS (0 0 8 * * *)
let trivia = new CronJob('0 * * * * *', function() {
    // Get trivia via API
    // Save trivia via JSON DB
    // Send trivia to Discord
    axios.get(process.env.API_CALL)
    .then(function (response) {
        // handle success
        db.set('trivia', response.data.results[0]);
        let trivia = response.data.results[0];
        let answer = trivia['correct_answer']; 
        let incorrect_answer = trivia['incorrect_answers'];
        let question = trivia['question'];
        let type = trivia['type'] == "boolean" ? "True/False" : "Multiple Choice";
        let category = trivia['category'];
        let difficulty = trivia['difficulty'];

        const exampleEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(question)
            .addFields(
                { name: 'Type', value: type, inline: true },
                { name: 'Category', value: category, inline: true },
                { name: 'Difficulty', value: difficulty, inline: true },
            )

        
        if (trivia['type'] == "multiple") {
            let choices = incorrect_answer;
            choices.push(answer);

            function fisherYatesShuffle(arr){
                for(var i =arr.length-1 ; i>0 ;i--){
                    var j = Math.floor( Math.random() * (i + 1) ); //random index
                    [arr[i],arr[j]]=[arr[j],arr[i]]; // swap
                }
            }
            
            fisherYatesShuffle(choices);

            exampleEmbed.addField('Take note!', 'Please answer the value, not the choice.', false);
            exampleEmbed.addFields(
                { name: 'A', value: choices[0], inline: true },
                { name: 'B', value: choices[1], inline: true },
                { name: 'C', value: choices[2], inline: true },
                { name: 'D', value: choices[3], inline: true },
            )
        }

        // Send trivia to discord
        client.channels.cache.get(process.env.CHANNEL_ID).send({ embeds: [exampleEmbed] });
    })
    .catch(function (error) {
        // handle error
        console.log(error);
    })
    .then(function () {
        // always executed
    });
}, null, true, 'Asia/Manila');
trivia.start();