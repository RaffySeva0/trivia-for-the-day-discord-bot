require("dotenv").config();
const axios = require("axios");
const CronJob = require("cron").CronJob;
const Discord = require("discord.js");
const { MessageEmbed } = require("discord.js");
const JSONdb = require("simple-json-db");
const db = new JSONdb(__dirname + "/storage.json");
const { decode } = require("html-entities");

const client = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });

// logs in console when bot is ready
client.once("ready", () => {
	console.log("Trivia For The Day Bot is ready");
});

// where there's a message receive and it is equals to the condition, send message pong!
client.on("messageCreate", (message) => {
	// console.log(message);
	// trivia for today
	let trivia = db.get("trivia");
	let answered = db.get("answered");
	let leaderboard = db.get("leaderboard");

	let answer = trivia["correct_answer"];

	// Getting of current trivia
	if (
		message.content === "!trivia" &&
		message.channelId === process.env.CHANNEL_ID
	) {
		// Send trivia to discord
		const exampleEmbed = triviaMessage(trivia);

		client.channels.cache
			.get(process.env.CHANNEL_ID)
			.send({ embeds: [exampleEmbed] });
	}

	// Sends current point of user
	if (
		message.content === "!points" &&
		message.channelId === process.env.CHANNEL_ID
	) {
		// console.log(message);
		let user = message.author;
		let user_id = user.id;

		// Gets username
		let userDisc = client.users.cache.find((user) => user.id === user_id);
		let username = userDisc.username;

		// Gets current points based on the leaderboard
		let successMessage = `*Hello ${username}! You currently have 0 points.*`;
		for (let i = 0; i < leaderboard.length; i++) {
			const el = leaderboard[i];
			if (el.id === user_id) {
				successMessage = `*Hello ${username}! You currently have ${el.points} points.*`;
				break;
			}
		}

		const channel = client.channels.cache.get(process.env.CHANNEL_ID);
		channel.send(successMessage).then((message) => {
			setTimeout(() => {
				message.delete();
			}, 2500);
		});
	}

	// Checking if message being sent is equals to the correct answer
	// Make answer and message lowercase
	if (
		message.content.toLowerCase() === answer.toLowerCase() &&
		answered === 0 &&
		message.channelId === process.env.CHANNEL_ID
	) {
		let user = message.author;
		let user_id = user.id;
		let username = user.username;

		// Check if user is in the leaderboard
		// If yes, increment points based on point difficulty
		// If not, add new user object in leaderboard
		let i = 0;
		for (; i < leaderboard.length && leaderboard[i]["id"] !== user_id; i++) {}

		if (i !== leaderboard.length) {
			leaderboard[i]["points"] += trivia.points;
		} else {
			leaderboard.push({ id: user_id, points: trivia.points });
		}

		answered = 1;

		// Update leaderboard and answered indicator
		db.set("leaderboard", leaderboard);
		db.set("answered", answered);
		console.log(leaderboard);
		console.log(answered);
		// console.log(message.author);
		console.log("YOU GOT THE CORRECT ANSWER");
	} else if (answered === 1) {
		// client.channels.cache
		// 	.get(process.env.CHANNEL_ID)
		// 	.send({ embeds: [exampleEmbed] });
	}
});

client.login(process.env.DISC_TOKEN);

// UPDATE FOR 8 AM PARAMETERS (0 0 8 * * *)
let trivia = new CronJob(
	"0 * * * * *",
	function () {
		// Get trivia via API
		// Save trivia via JSON DB
		// Send trivia to Discord
		axios
			.get(process.env.API_CALL)
			.then(function (response) {
				let trivia = response.data.results[0];

				trivia["correct_answer"] = decode(`${trivia["correct_answer"]}`, {
					level: "html5",
				});

				let difficulty = trivia["difficulty"];
				let points = 0;

				// Give the points
				// Check current difficulty
				switch (difficulty) {
					case "easy":
						points = randomPoint([1, 2, 3]);
						break;
					case "medium":
						points = randomPoint([4, 5, 6]);
						break;
					case "hard":
						points = randomPoint([7, 8, 10]);
						break;
				}

				// Assign point
				trivia["points"] = points;

				// handle success
				// setting trivia data in db
				db.set("trivia", trivia);
				// reset answered state
				db.set("answered", 0);

				const exampleEmbed = triviaMessage(trivia);

				// Send trivia to discord
				client.channels.cache
					.get(process.env.CHANNEL_ID)
					.send({ embeds: [exampleEmbed] });
			})
			.catch(function (error) {
				// handle error
				console.log(error);
			})
			.then(function () {
				// always executed
			});
	},
	null,
	true,
	"Asia/Manila"
);
trivia.start();

// OTHER FUNCTIONS
function randomPoint(points) {
	return points[Math.floor(Math.random() * points.length)];
}

function triviaMessage(trivia) {
	let answer = trivia["correct_answer"];
	let incorrect_answer = trivia["incorrect_answers"];
	let question = decode(`${trivia["question"]}`, { level: "html5" });
	let type = trivia["type"] == "boolean" ? "True/False" : "Multiple Choice";
	let category = trivia["category"];
	let difficulty = trivia["difficulty"];
	let points = trivia["points"];

	const exampleEmbed = new MessageEmbed()
		.setColor("#0099ff")
		.setTitle(question + ` (${points} pts)`)
		.addFields(
			{ name: "Type", value: type, inline: true },
			{ name: "Category", value: category, inline: true },
			{ name: "Difficulty", value: difficulty, inline: true }
		);

	if (trivia["type"] == "multiple") {
		let choices = incorrect_answer;
		choices.push(answer);

		function fisherYatesShuffle(arr) {
			for (var i = arr.length - 1; i > 0; i--) {
				var j = Math.floor(Math.random() * (i + 1)); //random index
				[arr[i], arr[j]] = [arr[j], arr[i]]; // swap
			}
		}

		fisherYatesShuffle(choices);

		exampleEmbed.addField(
			"Take note!",
			"Please answer the value, not the choice.",
			false
		);
		exampleEmbed.addFields(
			{ name: "A", value: choices[0], inline: true },
			{ name: "B", value: choices[1], inline: true },
			{ name: "C", value: choices[2], inline: true },
			{ name: "D", value: choices[3], inline: true }
		);
	}

	return exampleEmbed;
}
