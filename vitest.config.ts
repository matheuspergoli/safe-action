import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		globals: true,
		environment: "jsdom",
		root: "src",
		exclude: [...configDefaults.exclude, "**/node_modules/**", "**/dist/**", "**/index.ts"],
		coverage: {
			enabled: true,
			reportsDirectory: "../coverage",
			exclude: [
				...configDefaults.exclude,
				"**/node_modules/**",
				"**/dist/**",
				"**/utils.ts",
				"**/errors.ts",
				"**/index.ts",
				"**/*.spec.ts"
			]
		}
	}
})
