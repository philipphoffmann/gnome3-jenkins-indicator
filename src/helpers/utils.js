// log information to gnome-session logs
function log_info(msg) {
	var prefix = 'Jenkins CI Server Indicator: '
	global.log(prefix + msg);
}

// append a uri to a domain regardless whether domains ends with '/' or not
function urlAppend(domain, uri) {
	if( domain.length>=1 ) {
		return domain + (domain.charAt(domain.length-1)!='/' ? '/' : '') + uri;
	}
	else {
		return uri;
	}
}

// call operation on all elements of array2 which are not in array1 using a compare function
function arrayOpCompare(array1, array2, compare_func, operation_func) {
	for( var i=0 ; i<array1.length ; ++i ) 	{
		let found_in_array2 = false;

		for( var j=0 ; j<array2.length ; ++j ) {
			if( compare_func(array1[i], array2[j]) ) {
				found_in_array2 = true;
			}
		}

		if( !found_in_array2 ) {
			operation_func(i, array1[i]);
		}
	}
}

// checks if currentVersion (e.g. "3.12.1") is greater or equal than thresholdVersion (e.g. "3.10")
function versionIsAtLeast(currentVersion, thresholdVersion) {
	currentVersion = currentVersion.split('.');
	thresholdVersion = thresholdVersion.split('.');

	// iterate over three version levels ("major.minor.patch")
	for( var i = 0 ; i < 3 ; ++i ) {
		// sanitize version levels
		currentVersion[i] = currentVersion[i] || 0;
		thresholdVersion[i] = thresholdVersion[i] || 0;

		if( currentVersion[i] > thresholdVersion[i] ) {
			return true;
		}
		else if( currentVersion[i] < thresholdVersion[i] ) {
			return false;
		}
		// otherwise the current level is equal and therefor we need to check the next level
	}

	// in this case all version levels are equal, we consider this as a match
	return true;
}

// filters jobs according to filter settings
function filterJobs(jobs, settings) {
	jobs = jobs || [];
	let showAllJobs = false;
	let filteredJobs = [];
	let jobToShow = settings['jobs_to_show'].trim().split(",");
	log_info('Will apply the job name filters: ' + jobToShow);

	if ((jobToShow.length == 1) && jobToShow[0] == "all") {
		showAllJobs = true;
	}

	for (var i=0 ; i<jobs.length ; ++i) {
		// filter job if user decided not to show jobs with this state (in settings dialog)
		let filterJobState = settings[jobStates.getFilter(jobs[i].color)];
		// filter job if user decided not to show jobs with this name (in settings dialog)
		let filterJobByName = true;
		if (!showAllJobs) {
			filterJobByName = jobMatches(jobs[i], jobToShow);
		}

		if(filterJobState && filterJobByName){
			filteredJobs[filteredJobs.length] = jobs[i];
		}
	}

	return filteredJobs;
}

// return if a job matches a list of patterns ('!' char negates a pattern)
function jobMatches(job, patterns) {
	var passedFilters = true;
	patterns.forEach(function(pattern) {
		// early exit check
		if (!passedFilters) {
			// breaking loop early, since no need to do pattern matching further
			log_info('Not matching job ' + job.name + ' further');
			return;
		}
		var positiveSearch = pattern.indexOf("!") !== 0;
		if (!positiveSearch) {
			pattern = pattern.substring(1);
		}
		// if matches the apttern and we are looking for matches
		var matchingPattern = job.name.match(pattern);
		if (positiveSearch) {
			passedFilters = passedFilters && matchingPattern;
			if (passedFilters) {
				log_info('Positive match for job ' + job.name + ' for pattern [' + pattern + ']');
			}
		} else {
			passedFilters = passedFilters && !matchingPattern;
			if (passedFilters) {
				log_info('Negative match for job ' + job.name + ' for pattern [' + pattern + ']');
			}
		}
	})
	// return match result
	return passedFilters;
}

// returns icons and state ranks for job states
const jobStates = new function() {
	// define job states (colors) and their corresponding icon, feel free to add more here
	// this array is also used to determine the rank of a job state, low array index refers to a high rank
	// filter refers to the name of the filter setting (whether to show matching jobs or not)
	// name is used for notifications about job changes
	let states = [
		{ color: 'red_anime',     icon: 'clock',  filter: 'show_running_jobs',    name: 'running' },
		{ color: 'yellow_anime',  icon: 'clock',  filter: 'show_running_jobs',    name: 'running' },
		{ color: 'blue_anime',    icon: 'clock',  filter: 'show_running_jobs',    name: 'running' },
		{ color: 'grey_anime',    icon: 'clock',  filter: 'show_running_jobs',    name: 'running' },
		{ color: 'aborted_anime', icon: 'clock',  filter: 'show_running_jobs',    name: 'running' },
		{ color: 'red',           icon: 'red',    filter: 'show_failed_jobs',     name: 'failed' },
		{ color: 'yellow',        icon: 'yellow', filter: 'show_unstable_jobs',   name: 'unstable' },
		{ color: 'blue',          icon: 'blue',   filter: 'show_successful_jobs', name: 'successful' },
		{ color: 'green',         icon: 'blue',   filter: 'show_successful_jobs', name: 'successful' },
		{ color: 'grey',          icon: 'grey',   filter: 'show_neverbuilt_jobs', name: 'never built' },
		{ color: 'notbuilt',      icon: 'grey',   filter: 'show_notbuilt_jobs',   name: 'notbuilt' },
		{ color: 'aborted',       icon: 'grey',   filter: 'show_aborted_jobs',    name: 'aborted' },
		{ color: 'error',         icon: 'error',  filter: null,                   name: 'error' },
		{ color: 'disabled',      icon: 'grey',   filter: 'show_disabled_jobs',   name: 'disabled' }
	];

	// returns the rank of a job state, highest rank is 0, -1 means that the job state is unknown
	// this is used to determine the state of the overall indicator which shows the state of the highest ranked job
	this.getRank = function(job_color) {
		for( let i=0 ; i<states.length ; ++i ) {
			if( job_color==states[i].color ) return i;
		}
		return -1;
	};

	// returns the corresponding icon name of a job state
	this.getIcon = function(job_color, with_green_balls) {
		for( let i=0 ; i<states.length ; ++i ) {
			// use green balls plugin if actived
			if( with_green_balls && job_color=='blue' ) {
				return 'jenkins_green';
			}
			// if not just return a regular icon
			else if( job_color==states[i].color ) {
				return 'jenkins_' + states[i].icon;
			}
		}
		// if job color is unknown, use the grey icon
		return 'jenkins_grey';
	};

	// returns the corresponding icon name of a job state
	this.getFilter = function(job_color) {
		for( let i=0 ; i<states.length ; ++i ) {
			if( job_color==states[i].color ) {
				return states[i].filter;
			}
		}
		// if job color is unknown, use the filter setting for disabled jobs
		return 'show_disabled_jobs';
	};

	// returns the corresponding icon name of a job state
	this.getName = function(job_color) {
		for( let i=0 ; i<states.length ; ++i ) {
			if( job_color==states[i].color ) {
				return _(states[i].name);
			}
		}
		// if job color is unknown, use the filter setting for disabled jobs
		return 'unknown';
	};

	// returns the default job state to use for overall indicator
	this.getDefaultState = function() {
		// return lowest ranked job state
		return states[states.length-1].color;
	};

	// return the color of the error state for the overall indicator
	this.getErrorState = function() {
		return "error";
	};
};
