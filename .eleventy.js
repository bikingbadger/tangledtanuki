module.exports = function (eleventyConfig) {
	eleventyConfig.addPassthroughCopy('src/img');

	return {
	  passthroughFileCopy: true,
	  dir: {
		input: 'src',
		includes: '../settings/_includes',
		data: '../settings/_data',
		output: '_site',
	  },
	};
  };