# Documenting the Process of Making This Site

## Planning

I have six things I need to do:
- I provide a data set of video metadata
- Create system that downloads captions for YouTube videos
- Save captions in database in searchable way
- Create a UI that lets a user input a word
- UI calls API to retrieve matching captions and videos
- Rank the results in some meaningful way

I need to use SQLite as my database, Node.js as my language,
and Vue as my frontend framework.

Let's take each of the steps above and turn them into actionable steps.

### Metadata
I've been sent the metadata of 100K videos (277 MB!), all of which I need
to insert into my database and then download videos for. Doing this locally
would be a very bad idea; I'd like to watch *some* YouTube this evening
and won't be able to do that if my entire house gets rate-limited, so I'll need
to test this on a minute scale--let's say 50 videos--and then do all this scraping
slowly on an external machine, something like Google Cloud Shell is my best bet.

* Use jq to:
	* figure out the schema of the JSON I've been sent
	* pull out the first 50 videos
* Figure out what I need to store in a `videos` table
	* likely only the title and ID
* Insert all of the videos I have into the `videos` table with SQLite's JSON1 extension
* Do this at scale on GCS

### Downloading and Saving Captions
An intial jump into the DevTools of a YouTube video with captions show
some promise: a JSON API! This will certainly make it much easier for
me to download captions, as I won't need to bring in a parser for an
existing format!

There's one catch, though. The URL used to fetch it has a super long
`signature` paramater which I don't feel like cracking. So, we're going
old-skool and bringing in a WebVTT parser; the W3C's official `webvtt-parser`
looks like a solid choice. This means we'll need to figure out how tools
like `yt-dlp` and Pafy get YouTube video captions.

* Study exisiting software in order to figure out how to download a YouTube
video's WebVTT captions
* Implement a client in Node.js with node-fetch
* Store each video's captions' cues in a `cues` table
	* captions' video ID be a foreign key
	* cue's text
	* its start and end times in milliseconds
* Use SQLite's FTS5 extension in order to create a full-text search index

### UI
The UI should be pretty simple to make, although I've used Vue before.
Vue looks pretty nice though, so I don't think it's going to be a major
pain to learn it on the fly.

I'll watch their official intro course in order to get the basics: https://www.vuemastery.com/courses/intro-to-vue-3/intro-to-vue3/

Here's a breakdown of the components I'll need:
* App: the entry point for the project
* SearchBar: the main point of interaction with the project
	* will create a SearchResults element on a `submit` event
	* will also feature native autocomplete via a debounce and my neat <datalist> trick: https://github.com/SuperSonicHub1/vanilla-js-typeahead
* SearchResults: a container for my Cue components
	* it's the thing that actually makes the API requests
* Cue: the thing you're here for
	* shows text and timestamps encased in <time> elements
	* the timestamps are hyperlinks to go watch the YT video at that exact point
* YTSegment (optional): see the segment of the video you want to watch without leaving the site
	* will show on a click of either of the hyperlinks and play the exact segment relevant to what you're watching
	* use work from steadfast-consumption: https://github.com/SuperSonicHub1/steadfast-consumption/blob/912520d6f498bce17eb9c791704e743eb6ffdcd3/steadfast_consumption/static/sequencer.js
* Video (optional): see an entire video's captions
	* associate each cue with a fragment so that they can be linked to from the SearchResults fragment

I plan to use Vite to spin up a Vue-Express server which will give me SSR
for free, so that should be pretty neat.

### API
I'll be using the classic Expresss in order to create a JSON API for the front end.
I've done this a thousand times at this point, so this should be trivial.

* autocomplete: return a list of cues and the titles they go with
* results: get a list of cues having to do with your query
	* group them by video ID so that you're not searching like crazy for associate cues
	* SQLite ranks query results via a relevance algorithm, which in my experience is pretty, good, so I don't think I need to do anything more

They can both be queried via the `q` parameter.

I'll need to write SQL queries for each of these endpoints. `better-sqlite3` automatically transforms your query into a JavaScript,
so only minimal processing will likely be needed before it can be sent over the wire.

## Coding

### Metadata

#### Using jq

First, let's get those first 50 videos saved to a new file:
```bash
jq .[0:50] videos.json > 50videos.json
mv videos.json .videos.json
mv 50videos.json videos.json
```

Each video is an object in an array. Each video's ID can be accessed
with the path `._id` and each video's title can be accessed with
`.snippet.title`.

#### Inserting

First, let's create a table:
```sql
CREATE TABLE IF NOT EXISTS videos (
	id TEXT PRIMARY KEY,
	title TEXT
);
```

Now, let's write a small script to insert all the videos.
```js
// scripts/insert-videos.js
const Database = require('better-sqlite')
const videos = require('../videos.json')

const db = new Database('videos.json')

db.exec(`CREATE TABLE IF NOT EXISTS videos (
	id TEXT PRIMARY KEY,
	title TEXT
);`);

for (const video of videos) {
	const id = video._id,
		title = video.snippet.title

	db
		.prepare('INSERT INTO videos VALUES (?, ?);')
		.run(id, title)
}
```

Let's make sure that our code works:
```bash
node scripts/insert-videos.js
sqlite3 captions.db 'SELECT * FROM videos LIMIT 5'
xCBgGDqqzkQ|Coven Evelynn Skin Spotlight - Pre-Release - League of Legends
CRQz2CmOTpA|Your WORST League of Legends Experience
-G5ZmwnXG3w|number 15 league of legends foot lettuce
TuCqoCtMynw|Old God Malphite Skin Spotlight - Pre-Release - League of Legends
Tj0FgjCYGB4|Here's WORST LEVEL 1 FAIL in Chinese Pro League of Legends | Funny LoL Series #911
```
Nice! Seems like there's a lot of League in here.

### Downloading and Saving Captions

#### Research

As much as I love youtube-dl, it's codebase is insanely complicated, so I'm going
to avoid it and look at the much smaller YouTube-focused Pafy library instead... Or
maybe I don't need to, as it seems that someone has done it for me in the form
of `ytcog`: https://github.com/gatecrasher777/ytcog

Seems like everybody's implementing their own youtube-dl in their language of
choice these days. Saves me some trouble, as YouTube's API is complicated and not
something I want to study and read about, espicially since I can't even monitor it
myself in the browser.

---

I've found myself at an impasse. I thought `ytcog` would give me the WebVTT captions
to a YouTube video, but it instead gives me the link to one of **3**, yes, **three**
proprietary XML-based caption formats YouTube uses, specifically `srv1`. I am
considering bringing in Cheerio to parse the XML and turn it into a bunch of objects,
as the format is suprisingly simple. I feel like that's the coward's way though.

Looking further into this, it looks like `yt-dlp` takes the one caption URL that the
API gives it and transforms it in order to give the end-user all the formats they want,
including that JSON one we were originally planning to use. I'm going to step away from
this part for a bit and have a think about what I should do next.

#### Implementing

After taking some time to think, I've realized that I've fallen down a rabbit hole
and that I need to exit it. I'm going to use Cheerio to parse the XML and get this
section over with.

---

Finally finished! Let's make sure our code worked!
```bash
node scripts/insert-captions.js
sqlite3 captions.db 'SELECT * FROM captions LIMIT 5'
-G5ZmwnXG3w|80.0|2640.0|getting old
-G5ZmwnXG3w|3360.0|6400.0|right 24 is old
-G5ZmwnXG3w|6799.0|10320.0|i love facebook facebook is for boomers
-G5ZmwnXG3w|9360.0|13440.0|that's for us
-G5ZmwnXG3w|10320.0|14880.0|old folk go to get our our kicks
```

### API

Our API is an extremely simple JSON web app constructed with Express.
SQLite's FTS5 extension does most of the heavy lifting in terms of
giving us pretty decent search.

```js
const express = require('express')
const Database = require('better-sqlite3')

const app = express()
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

app.listen(4000, () => console.log("http://localhost:3000/"))
```

### Frontend
I hacked the majority of the frontend together in an hour after watching Vue Mastery's
"Intro to Vue 3" course on 2x speed. Gotta say, I like writing code in Vue, even though
I did it in one JavaScript file instead of a bunch of single-page components like most
people. Still think vanilla JS rocks though, and you can fight me on that.
