class Timedelta {
	constructor(milliseconds) {
		let timeleft = milliseconds

		if (timeleft > 0) {
			this.milliseconds = timeleft % 1000
			timeleft = Math.floor(timeleft / 1000)
		}

		if (timeleft > 0) {
			this.seconds = timeleft % 60
			timeleft = Math.floor(timeleft / 60)
		}

		if (timeleft > 0) {
			this.minutes = timeleft % 60
			timeleft = Math.floor(timeleft / 60)
		}

		if (timeleft > 0) {
			this.hours = timeleft % 24
			timeleft = Math.floor(timeleft / 24)
		}
	}

	get humanDuration() {
		let result = ""

		if (this.hours !== undefined) {
			result += this.hours + " hours, "
		}

		if (this.minutes !== undefined) {
			result += this.minutes + " minutes, "
		}

		if (this.seconds !== undefined) {
			let seconds = this.seconds
			if (this.milliseconds !== undefined) {
				seconds += this.milliseconds / 1000
			}
			result += seconds + " seconds"
		}

		return result
	}

	get htmlDuration() {
		// https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#durations
		let result = "PT"

		if (this.hours !== undefined) {
			result += this.hours + "H"
		}

		if (this.minutes !== undefined) {
			result += this.minutes + "M"
		}

		if (this.seconds !== undefined) {
			let seconds = this.seconds
			if (this.milliseconds !== undefined) {
				seconds += this.milliseconds / 1000
			}
			result += seconds + "S"
		}

		return result
	}
}

// https://router.vuejs.org/guide/advanced/data-fetching.html#fetching-after-navigation
const app = Vue.createApp({
    data() {
        return {
			results: [],
			error: null,
			loading: false,
		}
    },
	methods: {
		log: console.log,
		async fetchData(query) {
			this.error = null
			this.results = null

			this.loading = true


			const res = await fetch(`/search?q=${encodeURIComponent(query)}`)
			this.results = await res.json()

			this.loading = false
		},
	}
})

app.component('search-bar', {
	template:
	`<form @submit.prevent="onSubmit">
		<input type="text" @input="autocomplete" v-model="query" list="autocomplete" placeholder="hello">
		<button type="submit">Submit</button>
	</form>
	<datalist id="autocomplete">
		<option v-for="(choice, index) in choices" :key="index" :value="choice">
	</datalist>`,
	data() {
		return {
			query: '',
			choices: [],
		}
	},
	methods: {
		onSubmit(e) {
			const {query} = this
			this.$emit("query", query)
		},
		async autocomplete(e) {
			const {query} = this
			const res = await fetch(`/autocomplete?q=${encodeURIComponent(query)}`)
			this.choices = await res.json()
		},
	},
})

app.component('results', {
	template:
	`<section id="results">
		<ul v-if="results.length">
			<result v-for="(result, index) in results" :key="index" :result="result"></result>
		</ul>
		<p v-else>
			<b>No results!</b>
		</p>
	</section>`,
	props: {
		results: {
			type: Array,
			required: true,
		},
	},
	data() {
		return {}
	},
})

app.component('result', {
	template:
	`<article class="result flex">
		<a :href="startLink">
			<img :src="thumbnail">
		</a>
		<div>
			<a :href="videoLink">
				<h2>{{ result.title }}</h2>
			</a>
			<p v-html="result.text"></p>
			<p><time :datetime="startTimedelta.htmlDuration">{{ startTimedelta.humanDuration }}</time> to <time :datetime="endTimedelta.htmlDuration">{{ endTimedelta.humanDuration }}</time></p>
		</div>
	</article>`,
	props: {
		result: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {}
	},
	computed: {
		thumbnail() {
			const {result} = this
			return `https://img.youtube.com/vi/${encodeURIComponent(result.video_id)}/default.jpg`
		},
		videoLink() {
			const {result} = this
			return `https://youtube.com/watch?v=${encodeURIComponent(result.video_id)}`
		},
		startLink() {
			const {result} = this
			const start = Math.floor(result.start / 1000)
			return `${this.videoLink}&t=${start}`
		},
		endLink() {
			const {result} = this
			const end = Math.floor(result.end / 1000)
			return `${this.videoLink}&t=${end}`
		},
		startTimedelta() {
			const {result} = this
			return new Timedelta(result.start)
		},
		endTimedelta() {
			const {result} = this
			return new Timedelta(result.end)
		},
	}
})

const mountedApp = app.mount('#app')
