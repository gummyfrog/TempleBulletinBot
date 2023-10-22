const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
var HTMLParser = require('node-html-parser');


const terms = [
	{ code: '202436', description: 'Fall 2024' },
	// { code: '202426', description: '2024 Summer II' },
	// { code: '202420', description: '2024 Summer I' },
	{ code: '202403', description: 'Spring 2024' },
	{ code: '202336', description: 'Fall 2023' },
	// { code: '202326', description: '2023 Summer II' },
	// { code: '202320', description: '2023 Summer I' },
  ]



const endpoints = {
	getPrereqs: {
		url: 'https://prd-xereg.temple.edu/StudentRegistrationSsb/ssb/courseSearchResults/getPrerequisites',
		parser: (data, embed) => { 
			return data } },

	getDetails: {
		url: 'https://prd-xereg.temple.edu/StudentRegistrationSsb/ssb/courseSearchResults/getCourseCatalogDetails',
		parser: (data, embed) => { 
				// console.log(data);
			
				var root = HTMLParser.parse(data);
				var topics = root.querySelectorAll('.status-bold');
				var brs = root.getElementsByTagName('br');
				
				for(var br of brs) {
					br.remove();
				}

				for(var topic of topics) {
					var topicName = topic.rawText;
					var topicDescription = topic.nextElementSibling.rawText.replace('&amp;', '&');

					if(topicDescription.split(' ').pop().length <= 2) {
						topicDescription = topicDescription.slice(0, -2);
					}

					if(topicName =="Hours:") {
						topicDescription += " "+ root.querySelector('.credit-hours-direction').rawText;
					}

					if(topicName == 'Title:') {
						embed.setTitle(topicDescription);
					} else if(topicDescription != "" && topicName != ""){
						embed.addFields(
							{ name: topicName, value: topicDescription, inline: true},
						);
					}
				}
			} 
		},

	getDescription: { 
		url: 'https://prd-xereg.temple.edu/StudentRegistrationSsb/ssb/courseSearchResults/getCourseDescription',
		parser: (data, embed) => { 
			var root = HTMLParser.parse(data);
			var text = root.getElementsByTagName('p')[0];
			embed.setDescription(text.rawText)
		 } 
	}
}

const requestHeaders = {
	'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
	'X-Requested-With': 'XMLHttpRequest',
	'Origin': 'https://prd-xereg.temple.edu',
	'Connection': 'keep-alive',
	'Referer': 'https://prd-xereg.temple.edu/StudentRegistrationSsb/ssb/courseSearch/courseSearch',
	'Sec-Fetch-Dest': 'empty',
	'Sec-Fetch-Mode': 'cors',
	'Sec-Fetch-Site': 'same-origin',
  }


const makeRequest = async (endpoint, data, embed) => {
	const response = await axios.post(endpoint.url, data, {
		headers: requestHeaders
	})

	return endpoint.parser(response.data, embed);
}


module.exports = {
	data: new SlashCommandBuilder()
		.setName('courses')
		.setDescription('Searches the Temple Course Catalog.')
		// .addStringOption(option => {

			
		// 	option.setName('term')
		// 		.setDescription('Course Term')
		// 		.setRequired(true)
				
		// 		for(var term of terms) {
		// 			option.addChoices({name: term.description, value: term.code})
		// 		}

		// 	return option;
		// })
				
		.addStringOption(option =>
			option.setName('subject')
				.setDescription('Course Subject')
				.setRequired(true)
		)

		.addStringOption(option =>
			option.setName('number')
				.setDescription('Course Number')
				.setRequired(true)),

	

	async execute(client, interaction) {

		if (client.cooldowns.has("Course")) {
			// cooldown not ended
			interaction.reply({ content: "This command is on cooldown. Please wait a few seconds.", ephemeral: true });
		} else {
			try {
				
				const course = {
					term: "202436",
					// term: interaction.options.getString('term'),
					subjectCode: interaction.options.getString('subject').toUpperCase(),
					courseNumber: interaction.options.getString('number')	
				}

				// if(terms.filter(term => term.code == course.term).length == 0) { 
				// 	await interaction.reply('Invalid Term.');
				// }
				var termFullName = terms.filter(term => term.code == course.term)[0].description;

				const embed = new EmbedBuilder()
					.setColor("#9E1B34")
					.setAuthor({ name: `Information on ${termFullName} ${course.subjectCode} ${course.courseNumber}`, iconURL: 'https://teamcolorcodes.com/wp-content/uploads/2018/05/Temple-Owls-Logo-PNG.png', url: 'https://prd-xereg.temple.edu/StudentRegistrationSsb/ssb/classSearch/classSearch' })


				await makeRequest(endpoints.getDescription, course, embed)
				await makeRequest(endpoints.getDetails, course, embed)

				client.cooldowns.set("Course", true);
				setTimeout(() => {
				client.cooldowns.delete("Course");
				}, client.COOLDOWN_SECONDS * 1000);

				await interaction.reply({embeds: [embed]});
				
			} catch (error) {
				console.error(error);
				await interaction.reply("Could not find that course.");
			}
		}
	},
};
