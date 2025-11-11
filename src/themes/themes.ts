export interface ITheme {
	name: string;
	colors: {
		primary: string;
		success: string;
		warning: string;
		error: string;
		info: string;
		secondary: string;
	};
	description: string;
}

export const THEMES: Record<string, ITheme> = {
	default: {
		name: "Default",
		colors: {
			primary: "#5865F2",
			success: "#57F287",
			warning: "#FEE75C",
			error: "#ED4245",
			info: "#00B0F4",
			secondary: "#7289DA",
		},
		description: "Classic Discord theme",
	},
	dark: {
		name: "Dark",
		colors: {
			primary: "#36393F",
			success: "#43B581",
			warning: "#FAA61A",
			error: "#F04747",
			info: "#4084D6",
			secondary: "#2C2F33",
		},
		description: "Dark theme for less brightness",
	},
	ocean: {
		name: "Ocean",
		colors: {
			primary: "#006BA6",
			success: "#0496FF",
			warning: "#FFB703",
			error: "#D62828",
			info: "#1D7874",
			secondary: "#003459",
		},
		description: "Cool ocean-inspired colors",
	},
	sunset: {
		name: "Sunset",
		colors: {
			primary: "#FF6B6B",
			success: "#51CF66",
			warning: "#FFD93D",
			error: "#EE5A6F",
			info: "#FF922B",
			secondary: "#C92A2A",
		},
		description: "Warm sunset vibes",
	},
	forest: {
		name: "Forest",
		colors: {
			primary: "#2D6A4F",
			success: "#52B788",
			warning: "#97BC62",
			error: "#D62828",
			info: "#1B4332",
			secondary: "#1B5E20",
		},
		description: "Natural green tones",
	},
	cyberpunk: {
		name: "Cyberpunk",
		colors: {
			primary: "#FF006E",
			success: "#00F5FF",
			warning: "#FFBE0B",
			error: "#FF006E",
			info: "#8338EC",
			secondary: "#3A86FF",
		},
		description: "Neon cyberpunk aesthetic",
	},
	midnight: {
		name: "Midnight",
		colors: {
			primary: "#0D1B2A",
			success: "#1B4965",
			warning: "#E8B4B8",
			error: "#A23B72",
			info: "#F18F01",
			secondary: "#1A535C",
		},
		description: "Deep midnight blues",
	},
};

export class ThemeManager {
	static getTheme(themeName: string): ITheme {
		return THEMES[themeName.toLowerCase()] || THEMES.default;
	}

	static getAllThemes(): string[] {
		return Object.keys(THEMES);
	}

	static getThemeEmbed(themeName: string): any {
		const theme = this.getTheme(themeName);
		return {
			primary: parseInt(theme.colors.primary.replace("#", ""), 16),
			success: parseInt(theme.colors.success.replace("#", ""), 16),
			warning: parseInt(theme.colors.warning.replace("#", ""), 16),
			error: parseInt(theme.colors.error.replace("#", ""), 16),
			info: parseInt(theme.colors.info.replace("#", ""), 16),
			secondary: parseInt(theme.colors.secondary.replace("#", ""), 16),
		};
	}

	static validateTheme(themeName: string): boolean {
		return themeName.toLowerCase() in THEMES;
	}
}
