const express = require('express')
const Database = require('better-sqlite3')
const path = require('path')

const app = express()
app.use(express.static(path.join(__dirname, 'static')))

const db = new Database('captions.db')

const autocompleteQuery = db.prepare(`SELECT text
FROM captions_index
WHERE captions_index MATCH ?
ORDER BY rank
LIMIT 5;`)

const searchQuery = db.prepare(`WITH rankings (id, rank, text) AS (
	SELECT rowid, rank, highlight(captions_index, 0, '<b>', '</b>')
	FROM captions_index
	WHERE captions_index MATCH ?
)

SELECT captions.video_id, rankings.text, captions.start, captions.end, videos.id, videos.title
FROM captions, rankings
LEFT JOIN videos
ON captions.video_id = videos.id
WHERE captions.rowid = rankings.id
ORDER BY rankings.rank, captions.video_id;`)

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, '/index.html'));
})

app.get("/autocomplete", (req, res) => {
	const {q} = req.query
	const rows = autocompleteQuery.all(q)
	res.json(rows.map(x => x.text))
})

app.get("/search", (req, res) => {
	const {q} = req.query
	const rows = searchQuery.all(q)
	res.json(rows)
})

app.listen(4000, () => console.log("http://localhost:4000/"))
