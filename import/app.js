require('dotenv').config()

const fs = require('fs/promises');
const path = require('path')
const fileProcess = require('./file-process');

const sourcePath = process.env.SOURCE_PATH;

const run = async () => {

	// Create the target src directory
	await fileProcess.createTargetDirectory();

	const results = await fs.readdir(sourcePath);
	const files = results
		.map(fileName => path.join(sourcePath, fileName))
		.filter(fileProcess.isFile);

	files.forEach(async sourceFile => {
		const yamlData = await fileProcess.yamlData(sourceFile);
		if (!yamlData) return;

		if (yamlData.metadata.publish && yamlData.metadata.site === process.env.SITE) {
			//copy the file to the destination directory
			const destinationFile = await fileProcess.copyFile(sourceFile);

			// Read the file to update links into a variable
			let fileData = await fs.readFile(destinationFile, { encoding: 'utf-8' });

			// Remove obsidian front matter
			const startFrontMatter = fileData.indexOf('#');
			const endFrontMatter = fileData.indexOf('---', startFrontMatter) + 3;
			const frontMatter = fileData.slice(startFrontMatter, endFrontMatter);
			fileData = fileData.replace(frontMatter, '');

			// Remove tasks
			const startTasks = fileData.indexOf('## Task');
			if (startTasks > 0) {
				const tasksData = fileData.slice(startTasks);
				fileData = fileData.replace(tasksData, '');
			}

			// extract links from the copied files to be imported
			const fileLinks = await fileProcess.getLinks(destinationFile, sourcePath);
			if (!fileLinks) return;

			fileLinks.forEach(async link => {
				if (link.exists &&
					link.meta.publish &&
					link.meta.site === process.env.SITE &&
					link.type === 'image') {

					// substitute the image links 
					const imageFile = link.meta.permalink.replaceAll("\\", "/").replace(process.env.TARGET_DIRECTORY, '')
					fileData = fileData.replace(link.link, `${link.meta.title}(${imageFile} "${link.meta.title}")`);
					//copy the file to the destination directory
					const destinationFile = await fileProcess.copyFile(link.sourceFile, path.join(link.meta.permalink));
				}

				// Check if file exists convert to md link
				if (link.exists &&
					link.meta.publish &&
					link.meta.site === process.env.SITE &&
					link.type === 'md') {
					// Substitute the links in the file to markdown
					//console.log(link);
					fileData = fileData.replace(link.link, `[${link.meta.title}](${link.meta.permalink})`);
				} else {
					// Check if theres a file alias and set title accordingly
					let fileTitle = link.link.replace('[[', '').replace(']]', '')
					const hasAlias = fileTitle.indexOf('|');
					fileTitle = (hasAlias > 0) ? fileTitle.slice(hasAlias + 1) : fileTitle;
					fileData = fileData.replace(link.link, fileTitle);
				}

				// Create report
				if (!link.exists) {
					console.log(`${link.link}: ${link.sourceFile} does not exist`);
				} else {
					if (!link.meta.publish) {
						console.log(`${fileName.base}-${link.link}: exists but not published`);
					} else {
						if (!link.meta.site) {
							console.log(`${fileName.base}-${link.link}: site not set`);
						}

						if (link.meta.site !== process.env.SITE) {
							console.log(`${fileName.base}-${link.link}: site not equal to current site`);
						}
					}
				}
			});

			// Write the conversions to the file
			const writeFile = await fs.writeFile(destinationFile, fileData);
		}
	})

}

run();