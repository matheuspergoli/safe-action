/** @type {import("eslint").Linter.Config} */
module.exports = {
	extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
	plugins: ["filenames"],
	parser: "@typescript-eslint/parser",
	parserOptions: {
		project: true,
		tsconfigRootDir: __dirname
	},
	rules: {
		"@typescript-eslint/no-explicit-any": "off",
		"filenames/match-regex": ["error", "^[a-z-.]+$", true],
		"@typescript-eslint/no-unused-vars": [
			"error",
			{
				args: "all",
				argsIgnorePattern: "^_",
				caughtErrors: "all",
				caughtErrorsIgnorePattern: "^_",
				destructuredArrayIgnorePattern: "^_",
				varsIgnorePattern: "^_",
				ignoreRestSiblings: true
			}
		]
	},
	ignorePatterns: [
		"**/.*.js",
		"**/.*.ts",
		"**/*.config.ts",
		"**/*.config.js",
		"node_modules"
	]
}
