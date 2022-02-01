# YouTube Caption Search
YouTube videos in, search index of their captions out.

Written in/with:
* Node.js
* SQLite
* HTML
* CSS
* Browser JS
* Vue

## Setup
You know the deal:
```bash
git clone https://github.com/supersonichub1/youtube-caption-search
cd youtube-caption-search
npm i
npm start
```

### Database
The project comes with a SQLite database so that you can immediately try it out.
Creating your own is a whole 'nother story. Assuming you've done the above:
```bash
# Substitute this with your own.
echo '[{"_id": "woop", "snippet": {"title": "woop woop"}}]' > videos.json
node scripts/insert_videos.js
node scripts/insert_captions.js
```

## Reflection
Wrote this project over the course of three days. Spent one day writing
up my plans, another completing most of the stuff that needed to be done,
and the last scrambling to write a front-end. Suffice to say that I got a
little cocky thinking I could learn a new frontend framework in one day, and
I will never do that again. I've also found myself thankful for all the work
I've done in the past--formatting timedeltas, expirementing with typeahead,
scraping Hacker News posts, scraping HTML, playing with SQL and full-text search--
it was really helpful being able to grab scraps of knowledge from both my Git
repos and my mind in order to do all this junk.

### Shortcomings
I can't really think of anything. My app pretty much does everything I wanted it
to. Queries are pretty fast and the frontend doesn't have any glaring bugs or glitches.
Pretty satisfied with what I've created here.

### Possible Improvements
* could make SQL queries and statements more efficient
* move from JS to SPCs for Vue
* add a component that allows you to watch the cue you've queried
* maybe group results by video?
* have a way to read the entirety of a video's captions on one page
* display other textual data from YT videos
	* live chat logs
	* comments
	* descriptions
