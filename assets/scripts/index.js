/* global Vue */

import chart from './TheChart';

const toPercentageFilter = function toPercentageFilter(value) {
	return `${Math.round(parseFloat(value) * 100)}%`;
};

Vue.filter('toPercentage', toPercentageFilter);

const booleanToStringFilter = function booleanToStringFilter(value, trueText, falseText) {
	return value ? trueText || 'true' : falseText || 'false';
};

Vue.filter('booleanToString', booleanToStringFilter);

Vue.component('the-chart', chart);

const components = {};

if (document.querySelector('#results__profile')) {
	components.profile = {
		template: '#results__profile',
		props: {
			user: {
				type: Object,
				required: false,
			},
			transform: {
				type: String,
				required: false,
				default: '0 43 43',
			},
			to: {
				type: String,
				required: false,
				default: '0 43 43',
			},
			value: {
				type: Number,
				required: false,
				default: 0,
			},
			index: {
				type: Number,
				required: true,
			},
			focusable: {
				type: Boolean,
				required: false,
				default: false,
			},
			removeProfile: {
				type: Function,
				required: true,
			},
			toApprove: {
				type: Function,
				required: true,
			},
			toDisapprove: {
				type: Function,
				required: true,
			},
		},
		filters: {
			profileLink(username) {
				return `https://twitter.com/${username.replace('@', '')}`;
			},
			permalink(username) {
				return `${window.location.origin}${window.location.pathname}?socialnetwork=twitter&profile=${username.replace('@', '')}&search_for=profile`;
			},
			whatsAppItLink(username) {
				const url = encodeURIComponent(window.location.href);
				const title = encodeURIComponent(`O @pegabots quer saber se @${username.replace('@', '')} é um bot ou não. Qual a sua opinião?`);

				return `https://api.whatsapp.com/send?text=${title}%20${url}`;
			},
			facebookItLink(username) {
				const url = encodeURIComponent(window.location.href);
				const title = encodeURIComponent(`O @pegabots quer saber se @${username.replace('@', '')} é um bot ou não. Qual a sua opinião?`);

				return `https://www.facebook.com/sharer.php?u=${url}&t=${title}`;
			},
			tweetItLink(username) {
				const hashtags = 'Pegabot';
				const title = encodeURIComponent(`O @pegabots quer saber se @${username.replace('@', '')} é um bot ou não. Qual a sua opinião?`);
				const url = encodeURIComponent(window.location.href);

				return `https://twitter.com/intent/tweet?url=${url}&text=${title}&hashtags=${hashtags}`;
			},
			resultLevel(value) {
				let level = 0;

				if (value <= (1 / 5)) {
					level = 1;
				} else if (value <= (1 / 5) * 2) {
					level = 2;
				} else if (value <= (1 / 5) * 3) {
					level = 3;
				} else if (value <= (1 / 5) * 4) {
					level = 4;
				} else {
					level = 4;
				}

				return `test-result--level-${level}`;
			},
		},
	};
}

if (document.querySelector('#results__footer')) {
	components['results-footer'] = {
		template: '#results__footer',
		props: {
			metadata: {
				type: Object,
				required: true,
			},
			'cancel-request': {
				type: Function,
				required: true,
			},
		},
	};
}

if (document.querySelector('#results__form')) {
	components['results-form'] = {
		template: '#results__form',
		props: {
			metadata: {
				type: Object,
				required: true,
			},
		},
	};
}

if (document.querySelector('#results__detail')) {
	components['results-detail'] = {
		template: '#results__detail',
		props: {
			item: {
				type: Object,
				required: true,
				default: () => ({}),
			},
			loading: {
				type: Boolean,
				required: true,
				default: false,
			},
			propertyName: {
				type: String,
				required: true,
				default: '',
			},
		},
	};
}

window.$vue = new Vue({
	el: '#app',
	data: {
		profileDetails: null,
		debug: true,
		profileList: [],
		error: null,
		metadata: {
			apiURL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
				? 'http://localhost:8010/proxy'
				: '',
			loading: true,
			current: 0,
			total: 0,
			download: '',
			query: {},
			limit: 12,
		},
		xhr_request: [],
	},
	components,
	computed: {
		isDetailedView() {
			return window.document.documentElement.className.indexOf('details-page') !== -1;
		},
	},
	methods: {
		getQueryString(uri) {
			const queryString = uri || window.location.search;
			const params = {};
			const queries = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');

			for (let i = 0; i < queries.length; i += 1) {
				const element = queries[i].split('=');
				params[decodeURIComponent(element[0])] = decodeURIComponent(element[1] || '');
			}

			return params;
		},
		loadResults(params, currentIndex = 0) {
			const endPoint = this.isDetailedView
				? `${this.metadata.apiURL}/analyze`
				: `${this.metadata.apiURL}/botometer`;

			this.error = null;
			this.metadata.loading = true;

			// this.$http.get(endPoint, {
			// dev only on /results
			// this.$http.get('/botometer.json', {
			// dev only on /details
			this.$http.get('/details.json', {
				params,
				before(xhr) {
					this.xhr_request.push(xhr);
				},
			}).then((response) => {
				if (response.body.request_url) {
					window.location = response.body.request_url;
				} else if (response.headers.get('content-type')
					&& response.headers.get('content-type').indexOf('application/octet-stream') !== -1
				) {
					const url = window.URL.createObjectURL(new Blob([response.body]));
					const link = document.createElement('a');
					const filename = response.headers.get('content-disposition')
						.split('filename=')[1]
						.split(';')[0]
						.replace('"', '');

					link.href = url;
					link.setAttribute('download', filename);
					document.body.appendChild(link);
					link.click();
				} else {
					if (response.body.metadata && response.body.metadata.error) {
						window.alert(response.body.metadata.error); // eslint-disable-line no-alert
					}

					if (response.status === 200) {
						if (response.body.analysis_id) {
							this.analysisId = response.body.analysis_id;
						}

						if (this.isDetailedView) {
							this.profileDetails = response.body.root;
						}

						if (response.body.profiles) {
							let profileList = response.body.profiles;

							if (params.search_for === 'followers' || params.search_for === 'friends') {
								if (this.metadata.limit > 0 && this.metadata.limit < profileList.length) {
									profileList = profileList.slice(0, this.metadata.limit);
								} else if (this.metadata.limit > profileList.length) {
									this.metadata.limit = profileList.length;
								}
								this.metadata.total = profileList.length;
							} else if (params.search_for === 'profile') {
								this.metadata.current += 1;
							}

							if (params.search_for === 'profile') {
								this.$set(this.profileList, currentIndex, profileList[0]);
							} else if (params.search_for === 'followers' || params.search_for === 'friends') {
								this.profileList = this.profileList.concat(profileList);

								for (let index = 0; index < profileList.length; index += 1) {
									const thisProfile = profileList[index];
									this.$set(this.profileList, index, thisProfile);

									const newParams = Object.assign({}, params);
									newParams.profile = thisProfile.username;
									newParams.search_for = 'profile';

									this.loadResults(newParams, index);
								}
							}
						}
					} else if (response.status === 425) {
						window.alert('No Reason Phrase'); // eslint-disable-line no-alert
					}

					if (currentIndex === this.metadata.limit - 1) {
						this.metadata.loading = false;
					}
				}

				this.metadata.loading = false;
			}, (error) => {
				console.log('error', error); // eslint-disable-line no-console
				this.cancelRequest();
				this.error = error.statusText;
				this.metadata.loading = false;
				if (error.statusText) {
					window.alert(error.statusText); // eslint-disable-line no-alert
				}
			});
		},
		cancelRequest() {
			for (let i = 0; i < this.xhr_request.length; i += 1) {
				this.xhr_request.shift().abort();
			}
			this.metadata.loading = false;
		},
		removeProfile(index) {
			this.profileList.splice(index, 1);
		},
		showElement() {
			if (this.$el.hasAttribute('hidden')) {
				this.$el.removeAttribute('hidden');
			}
		},
		toApprove(index) {
			return this.submitApproval('approve', index);
		},
		toDisapprove(index) {
			return this.submitApproval('disapprove', index);
		},
		submitApproval(value = 'approve', index) {
			if (!this.profileList[index]) {
				throw Error('unknown profile submited');
			}

			if (value !== 'approve' && value !== 'disapprove') {
				throw Error('unknown approval value submited');
			}

			this.$set(this.profileList[index], 'loading', true);

			this.$http.post(`${this.metadata.apiURL}/feedback`, {
				opinion: value,
				analysis_id: this.analysisId,
				before(xhr) {
					this.xhr_request.push(xhr);
				},
			}).then((response) => {
				if (response.ok) {
					return response;
				}
				const error = new Error(response.body);
				error.name = response.status;

				if (response.status === 425) {
					window.alert('No Reason Phrase'); // eslint-disable-line no-alert
				}

				return Promise.reject(error);
			}).then(() => {
				this.$set(this.profileList[index], 'opinionSubmited', true);
				this.$set(this.profileList[index], 'loading', false);
			}).catch((error) => {
				this.$set(this.profileList[index], 'loading', false);
				this.cancelRequest();
				this.error = error.message;
				this.metadata.loading = false;
				window.alert(error.message); // eslint-disable-line no-alert
				throw error;
			});
		},
	},
	created() {
		this.metadata.query = this.getQueryString();

		if (this.metadata.query.search_for) {
			this.metadata.loading = true;
		}
	},
	mounted() {
		const params = {
			socialnetwork: this.metadata.query.socialnetwork,
			profile: this.metadata.query.profile,
			search_for: this.metadata.query.search_for,
			limit: (this.metadata.query.limit || 12),
		};

		if (this.metadata.query.verbose) {
			params.verbose = this.metadata.query.verbose;
			params.responseType = 'blob';
		}

		if (this.metadata.query.search_for === 'profile') {
			this.metadata.limit = 1;
			this.metadata.total = 1;
			params.limit = 1;
		}

		if (this.isDetailedView) {
			params.wantsDocument = 1;
			params.wants_document = 1;
			this.metadata.limit = 1;
			this.metadata.total = 1;
			params.limit = 1;
		}

		if (this.metadata.query.authenticated) {
			params.authenticated = this.metadata.query.authenticated;
		}

		if (this.metadata.query.oauth_token) {
			params.oauth_token = this.metadata.query.oauth_token;
		}

		if (this.metadata.query.oauth_verifier) {
			params.oauth_verifier = this.metadata.query.oauth_verifier;
		}

		this.loadResults(params);

		this.showElement();
	},
});
