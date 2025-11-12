export enum SearchEngine {
	YouTube = "ytsearch",
	YouTubeMusic = "ytmsearch",
	Spotify = "spsearch",
	Deezer = "dzsearch",
	Apple = "amsearch",
	SoundCloud = "scsearch",
	Yandex = "ymsearch",
	JioSaavn = "jssearch",
}

export enum Language {
	ChineseCN = "ChineseCN",
	ChineseTW = "ChineseTW",
	EnglishUS = "EnglishUS",
	French = "French",
	German = "German",
	Hindi = "Hindi",
	Indonesian = "Indonesian",
	Japanese = "Japanese",
	Korean = "Korean",
	Norwegian = "Norwegian",
	Polish = "Polish",
	Russian = "Russian",
	SpanishES = "SpanishES",
	Turkish = "Turkish",
	Vietnamese = "Vietnamese",
}
export const LocaleFlags = {
	[Language.ChineseCN]: "🇨🇳",
	[Language.ChineseTW]: "🇹🇼",
	[Language.EnglishUS]: "🇺🇸",
	[Language.French]: "🇫🇷",
	[Language.German]: "🇩🇪",
	[Language.Hindi]: "🇮🇳",
	[Language.Indonesian]: "🇮🇩",
	[Language.Japanese]: "🇯🇵",
	[Language.Korean]: "🇰🇷",
	[Language.Norwegian]: "🇳🇴",
	[Language.Polish]: "🇵🇱",
	[Language.Russian]: "🇷🇺",
	[Language.SpanishES]: "🇪🇸",
	[Language.Turkish]: "🇹🇷",
	[Language.Vietnamese]: "🇻🇳",
};

export interface Requester {
	id: string;
	username: string;
	discriminator?: string;
	avatarURL?: string;
}

