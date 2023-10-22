const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const terms = [
	{ code: '202436', description: 'Fall 2024' },
	// { code: '202426', description: '2024 Summer II' },
	// { code: '202420', description: '2024 Summer I' },
	{ code: '202403', description: 'Spring 2024' },
	{ code: '202336', description: 'Fall 2023' },
	// { code: '202326', description: '2023 Summer II' },
	// { code: '202320', description: '2023 Summer I' },
  ]


var teaches = async (course) => {

	return new Promise(async (resolve, reject) => {
		var cookieReq = await axios.get('https://prd-xereg.temple.edu/StudentRegistrationSsb/', {withCredentials: true});
		var cookies = cookieReq.headers['set-cookie'];
		var cookiesStr = "";
		for(var cookie of cookies) {
			cookiesStr += cookie.split(';')[0] + "; ";
		}

		cookiesStr = cookiesStr.substring(0, cookiesStr.length - 2);

		var headers = {
			"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/118.0",
			"Accept": "*/*",
			"Accept-Language": "en-US,en;q=0.5",
			"X-Synchronizer-Token": "dd8cd448-9e92-4933-90b4-00004e6f532d",
			"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
			"X-Requested-With": "XMLHttpRequest",
			"Sec-Fetch-Dest": "empty",
			"Sec-Fetch-Mode": "cors",
			"Sec-Fetch-Site": "same-origin",
			"Cookie": cookiesStr,
		}

		console.log(cookiesStr);

		// These fetches are to establish a session
		fetch("https://prd-xereg.temple.edu/StudentRegistrationSsb/ssb/term/search?mode=search", {
			"credentials": "include",
			"headers": headers,
			"body": `term=${course.term}`,
			"method": "POST",
		}).then(() => {
			fetch(`https://prd-xereg.temple.edu/StudentRegistrationSsb/ssb/classSearch/get_subject?searchTerm=&term=${course.term}&offset=1&max=10`, {
			"credentials": "include",
			"headers": headers,
			"method": "GET",
		}).then(() => {
		fetch("https://prd-xereg.temple.edu/StudentRegistrationSsb/ssb/classSearch/resetDataForm", {
			"credentials": "include",
			"headers": headers,
			"method": "POST",
		})
		.then(() => {
			// This fetch makes the actual search
			fetch(`https://prd-xereg.temple.edu/StudentRegistrationSsb/ssb/searchResults/searchResults?txt_subject=${course.subjectCode}&txt_courseNumber=${course.courseNumber}&txt_term=${course.term}&startDatepicker=&endDatepicker=&pageOffset=0&pageMaxSize=10&sortColumn=subjectDescription&sortDirection=asc`, {
				"headers": headers,
			})

			.then(function(serverPromise){ 
				serverPromise.json()
				.then(function(j) { 
					j.ztcEncodedImage = "";
					resolve(j.data);
				})
				.catch(function(e){
					console.log(e);
				});
			})
			.catch(function(e){
				console.log(e);
			});
		});
		});
		});
	});

}

// teaches({term: '202336', subjectCode: 'EES', courseNumber: '2021'});

var meetingDays = (meetingTime) => {
	var retString = "";

	if(meetingTime.monday) retString += "M";
	if(meetingTime.tuesday) retString += "T";
	if(meetingTime.wednesday) retString += "W";
	if(meetingTime.thursday) retString += "R";
	if(meetingTime.friday) retString += "F";
	if(meetingTime.saturday) retString += "S";

	return retString;
}


module.exports = {
	data: new SlashCommandBuilder()
		.setName('sections')
		.setDescription('Searches the Temple Course Catalog.')
		.addStringOption(option => {
			option.setName('term')
				.setDescription('Course Term')
				.setRequired(true)
				
				for(var term of terms) {
					option.addChoices({name: term.description, value: term.code})
				}

			return option;
		})
				
		.addStringOption(option =>
			option.setName('subject')
				.setDescription('Course Subject')
				.setRequired(true)
		)

		.addStringOption(option =>
			option.setName('number')
				.setDescription('Course Number')
				.setRequired(true)),

	

	async execute(interaction) {
		try {
			
			const course = {
				term: interaction.options.getString('term'),
				subjectCode: interaction.options.getString('subject').toUpperCase(),
				courseNumber: interaction.options.getString('number')	
			}

			if(terms.filter(term => term.code == course.term).length == 0) { 
				await interaction.reply('Invalid Term.');
			} 
			var termFullName = terms.filter(term => term.code == course.term)[0].description;

			const embed = new EmbedBuilder()
				.setColor("#9E1B34")
				.setAuthor({ name: `Sections for ${termFullName} ${course.subjectCode} ${course.courseNumber}`, iconURL: 'https://teamcolorcodes.com/wp-content/uploads/2018/05/Temple-Owls-Logo-PNG.png', url: 'https://prd-xereg.temple.edu/StudentRegistrationSsb/ssb/classSearch/classSearch' })

			var courses = await teaches(course);
			
			console.log(courses);
			for(var section of courses) {
				var string = `
					**Campus**: ${section.campusDescription}
					**${section.scheduleTypeDescription}**
				`

				for(var faculty of section.faculty) {
					string += `**Instructor:** ${faculty.displayName}
					📧 ${faculty.emailAddress}`

				}

				string += `\n**– Meeting Times –**`
				
				for(var meeting of section.meetingsFaculty) {
					string += `

						**MEETING TIME ${meeting.category}**
						${meeting.meetingTime.buildingDescription}
						⏳ ${meeting.meetingTime.beginTime}
					 	⌛ ${meeting.meetingTime.endTime}
						🗓️ ${meetingDays(meeting.meetingTime)}
					`
				}
				console.log(section.faculty);

				embed.addFields({name: `Section ${section.sequenceNumber} (${section.courseReferenceNumber})`, value: string, inline: true});
			}

			await interaction.reply({embeds: [embed]});

		} catch (error) {
			console.error(error);
			await interaction.reply("Could not find that course.");
		}
	},
};
