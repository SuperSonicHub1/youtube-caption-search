const Database = require('better-sqlite3')
const videos = require('../videos.json')

const db = new Database('captions.db')

db.exec(`CREATE TABLE IF NOT EXISTS videos (
	id TEXT PRIMARY KEY,
	title TEXT
);`);

const insert = db.prepare('INSERT INTO videos VALUES (?, ?);')

db.transaction(() => {
	for (const video of videos) {
		const id = video._id,
			title = video.snippet.title
		insert.run(id, title)
	}
})()
