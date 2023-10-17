const fs = require('fs/promises');
const path = require('path')
const metadataParser = require('markdown-yaml-metadata-parser')
const sourcePath = process.env.SOURCE_PATH;
const imagesPath = process.env.IMAGES_PATH;
const targetDirectory = process.env.TARGET_DIRECTORY;
const targetImageDirectory = 'img'

exports.yamlData = async (filename) => {
	try {
		const data = await fs.readFile(filename, { encoding: 'utf8' });
		const yaml = metadataParser(data);

		return yaml;
	} catch (err) {
		console.log(`Read error on ${filename}`, err);
	}
}

exports.fileExists = async file => !!(await fs.stat(file).catch(e => false));

exports.getLinks = async (filename) => {
	const yaml = await this.yamlData(filename);
	const regexp = /\[\[(.*?)\]\]/g;
	const links = yaml.content.match(regexp);

	if (!links) return;

	return await Promise.all(
		links.map(async link => {
			const linkObject = {
				link, sourceFile: '',
				exists: false,
				type: '',
				meta: {
					publish: false,
					permalink: '',
					title: link,
					site: ''
				}
			}

			// Check for images and ignore
			if (link.includes('.jpg') || link.includes('.jpeg') || link.includes('.png')) {
				
				// console.log('------------------------------>');
				// console.log(link);
				// console.log('------------------------------>');
				const imageName = link.replace('[[', '').replace(']]', '');
				// create full file name to check
				linkObject.sourceFile = await path.join(imagesPath, imageName);

				// set type
				linkObject.type = 'image'

				// Check if files exists
				linkObject.exists = await this.fileExists(linkObject.sourceFile);


				if (linkObject.exists) {
					linkObject.meta.publish = true;
					linkObject.meta.permalink = path.join(targetDirectory, targetImageDirectory, imageName)
					linkObject.meta.title = imageName;
					linkObject.meta.site = process.env.SITE;
				}

			} else {
				// create full file name to check
				linkObject.sourceFile = await path.join(sourcePath, link.replace('[[', '').replace(']]', '.md'));

				// set type
				linkObject.type = 'md';

				// Check if files exists
				linkObject.exists = await this.fileExists(linkObject.sourceFile);

				if (linkObject.exists) {
					const yamlMetadata = await this.yamlData(linkObject.sourceFile);
					linkObject.meta.publish = yamlMetadata.metadata.publish;
					linkObject.meta.permalink = yamlMetadata.metadata.permalink;

					linkObject.meta.title = yamlMetadata.metadata.title;
					linkObject.meta.site = yamlMetadata.metadata.site;
				}
			}

			return linkObject;
		})
	);
}

exports.copyFile = async (sourceFile, destFile) => {
	try {
		const fileName = path.parse(sourceFile)

		// create destination file name
		const destinationFile = destFile ? destFile : path.join(targetDirectory, fileName.base)

		if (!await this.fileExists(sourceFile)) return null;
		
		if (!await this.fileExists(destinationFile)) {
			await fs.copyFile(sourceFile, destinationFile);
			return destinationFile;
		}

		// check newer file
		const sourceStat = await fs.lstat(sourceFile);
		const destStat = await fs.lstat(destinationFile);

		//copy the file to the destination directory if it is newer
		if (sourceStat.mtimeMs >= destStat.mtimeMs) {
			console.log(fileName.base, sourceStat.mtimeMs >= destStat.mtimeMs, sourceStat.mtimeMs, destStat.mtimeMs);
			console.log(sourceFile, destinationFile);
			await fs.copyFile(sourceFile, destinationFile);
		}

		return destinationFile;

	} catch (error) {
		console.log('Copy error', error);
	}
}

exports.createTargetDirectory = async () => {
	try {
		if (!await fs.stat(targetDirectory)) {
			//console.log(`${targetDirectory} exists`);
			// await fs.rm(targetDirectory, { recursive: true, force: true }, err => {
			// 	if (err) {
			// 		throw err;
			// 	}
			// });
			// console.log(`${targetDirectory} is deleted!`);
			await fs.mkdir(targetDirectory);
		}

		if (!await fs.stat(`${targetDirectory}/${targetImageDirectory}`)) {
			await fs.mkdir(`${targetDirectory}/${targetImageDirectory}`);
			//console.log(`${targetDirectory} created`);
		}
	} catch (err) {
		console.error(`Error creating target: ${err}`);
	}
}

exports.isFile = async fileName => {
	//const fileStats = await fs.lstat(fileName);
	//console.log(fileName,path.extname(fileName) );
	return path.extname(fileName) === '.md' ;
	// ? /*fileStats.isFile()*/true : false;
};