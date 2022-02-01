const { Session, Video } = require('ytcog')
const miniget = require('miniget') // ytcog's HTTP client of choice
const cheerio = require('cheerio')
// Cheerio doesn't decode HTML entities for some reason
const { decode } = require('html-entities')
const Database = require('better-sqlite3')

const db = new Database('captions.db')
const session = new Session()

db.exec(`
-- Create captions table
CREATE TABLE IF NOT EXISTS captions (
	video_id TEXT,
	text TEXT,
	start FLOAT,
	end FLOAT,
	FOREIGN KEY (video_id) REFERENCES videos(id)
);

-- Initialize FTS stuff
CREATE VIRTUAL TABLE captions_index USING fts5(
	text,
	tokenize=porter
);

CREATE TRIGGER IF NOT EXISTS after_captions_insert AFTER INSERT ON captions BEGIN
	INSERT INTO captions_index (
		rowid,
		text
	)
	VALUES (
		new.rowid,
		new.text
	);
END;

CREATE TRIGGER after_captions_update UPDATE OF review ON captions BEGIN
  UPDATE captions_index SET text = new.text WHERE rowid = old.rowid;
END;


CREATE TRIGGER after_captions_delete AFTER DELETE ON captions BEGIN
    DELETE FROM captions_index WHERE rowid = old.rowid;
END;
`)

session.fetch().then(async () => {
	for (const {id} of db.prepare('SELECT id FROM videos;').all()) {
		const video = new Video(session, {id})
		await video.fetch()
		if (video.hasCaptions) {
			const captions = video.captions.filter(({name}) => name.includes("English"))
			if (captions.length > 0) {
				const text = await miniget(captions[0].url).text()
				const $ = cheerio.load(text)
				const cues = $("text")
					.map((index, element) => {
						const $text = $(element)
						const start = parseFloat($text.attr("start")) * 1000
						const end = start + (parseFloat($text.attr("dur")) * 1000)
						return {start, end, text: decode($text.text())}
					})
					.toArray()
				for (const {start, end, text} of cues) {
					db
						.prepare("INSERT INTO captions VALUES (?, ?, ?, ?);")
						.run(id, text, start, end,)
				}
			}
		}
	}
})

