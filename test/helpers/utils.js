const Utils = imports.src.helpers.utils;

function testSuite() {
	describe('urlAppend', function() {
		it('should append a URI to a domain not ending on /', function() {
			expect(Utils.urlAppend('http://www.example.com', 'path/to/something')).toBe('http://www.example.com/path/to/something');
		});

		it('should append a URI to a domain ending on /', function() {
			expect(Utils.urlAppend('http://www.example.com/', 'path/to/something')).toBe('http://www.example.com/path/to/something');
		});
	});

	describe('versionMatches', function() {
		it('should not match earlier versions', function() {
			expect(Utils.versionIsAtLeast("3.10", "3.12")).toBeFalsy();
			expect(Utils.versionIsAtLeast("3.10.1", "3.12")).toBeFalsy();
			expect(Utils.versionIsAtLeast("3.10", "3.12.1")).toBeFalsy();
			expect(Utils.versionIsAtLeast("3.12", "3.12.1")).toBeFalsy();
			expect(Utils.versionIsAtLeast("3.12.0", "3.12.1")).toBeFalsy();
		});

		it('should match equal versions', function() {
			expect(Utils.versionIsAtLeast("3.12", "3.12")).toBeTruthy();
			expect(Utils.versionIsAtLeast("3.12", "3.12.0")).toBeTruthy();
			expect(Utils.versionIsAtLeast("3.12.1", "3.12.1")).toBeTruthy();
		});

		it('should match greater versions', function() {
			expect(Utils.versionIsAtLeast("3.12", "3.10")).toBeTruthy();
			expect(Utils.versionIsAtLeast("3.12.1", "3.10")).toBeTruthy();
			expect(Utils.versionIsAtLeast("3.12", "3.10.1")).toBeTruthy();
			expect(Utils.versionIsAtLeast("3.12.1", "3.10.1")).toBeTruthy();
			expect(Utils.versionIsAtLeast("3.12.1", "3.12.0")).toBeTruthy();
		});
	});

	describe('filterJobs', function() {
		var jobs = [
			{name: "SomeJob", color: "blue"},
			{name: "AnotherJob", color: "red"}
		];
		var settings = {
			show_successful_jobs: true,
			show_failed_jobs: true
		};

		it('should filter no jobs by name if filter is set to "all"', function() {
			settings["jobs_to_show"] = "all";

			var filteredJobs = Utils.filterJobs(jobs, settings);
			expect(filteredJobs.length).toEqual(2);
			expect(filteredJobs[0]).toEqual(jobs[0]);
			expect(filteredJobs[1]).toEqual(jobs[1]);
		});

		it('should filter no jobs by name if filter is set to ""', function() {
			settings["jobs_to_show"] = "";

			var filteredJobs = Utils.filterJobs(jobs, settings);
			expect(filteredJobs.length).toEqual(2);
			expect(filteredJobs[0]).toEqual(jobs[0]);
			expect(filteredJobs[1]).toEqual(jobs[1]);
		});

		it('should filter jobs by name', function() {
			settings["jobs_to_show"] = "Another";

			var filteredJobs = Utils.filterJobs(jobs, settings);
			expect(filteredJobs.length).toEqual(1);
			expect(filteredJobs[0]).toEqual(jobs[1]);
		});

		it('should filter jobs by state', function() {
			settings["show_successful_job"] = false;

			var filteredJobs = Utils.filterJobs(jobs, settings);
			expect(filteredJobs.length).toEqual(1);
			expect(filteredJobs[0]).toEqual(jobs[1]);
		});
	});

	describe('jobMatches', function() {

		var testPatterns = [
			'testJob',
			'.*testJob',
			'testJob.*',
			'.*testJob.*',
			'.*test.*'
		];

		it('should match positive patterns', function() {
			var job = {
				name: 'testJob'
			};

			// try to match all test patterns
			for( var index = 0 ; index < testPatterns.length ; ++index ) {
				expect(Utils.jobMatches(job, [testPatterns[index]])).toBe(true);
			}
		});

		it('should not match negative patterns', function() {
			var job = {
				name: 'testJob'
			};

			// try to not match all negative test patterns
			for( var index = 0 ; index < testPatterns.length ; ++index ) {
				expect(Utils.jobMatches(job, ['!' + testPatterns[index]])).toBe(false);
			}

			expect(Utils.jobMatches(job, ['anotherJob'])).toBe(false);
		});
	});

	describe('jobStates::getRank', function() {
		it('should consider failed jobs with highest rank', function() {
			expect(Utils.jobStates.getRank('red_anime')).toBe(0);
		});
	});

	describe('jobStates::getIcon', function() {
		it('should return a blue icon for blue jobs if green balls are switched off', function() {
			expect(Utils.jobStates.getIcon('blue', false)).toBe('jenkins_blue');
		});

		it('should return a green icon for blue jobs if green balls are switched off', function() {
			expect(Utils.jobStates.getIcon('blue', true)).toBe('jenkins_green');
		});

		it('should return a gray icon for unknown jobs', function() {
			expect(Utils.jobStates.getIcon('someWeirdJobState', true)).toBe('jenkins_grey');
		});
	});

	describe('jobStates::getFilter', function() {
		it('should be able to get a filter for running jobs', function() {
			expect(Utils.jobStates.getFilter('red_anime')).toBe('show_running_jobs');
			expect(Utils.jobStates.getFilter('yellow_anime')).toBe('show_running_jobs');
			expect(Utils.jobStates.getFilter('blue_anime')).toBe('show_running_jobs');
			expect(Utils.jobStates.getFilter('grey_anime')).toBe('show_running_jobs');
			expect(Utils.jobStates.getFilter('aborted_anime')).toBe('show_running_jobs');
		});

		it('should return the filter for disabled jobs for unknown job states', function() {
			expect(Utils.jobStates.getFilter('someWeirdJobState')).toBe('show_disabled_jobs');
		});
	});

	describe('jobStates::getName', function() {
		it('should consider weirdly setup job names as unknown', function() {
			expect(Utils.jobStates.getName('someWeirdJobState')).toBe('unknown');
		});
	});

	describe('jobStates::getDefaultState', function() {
		it('should be disabled', function() {
			expect(Utils.jobStates.getDefaultState()).toBe('disabled');
		});
	});

	describe('jobStates::getErrorState', function() {
		it('should be red', function() {
			expect(Utils.jobStates.getErrorState()).toBe('error');
		});
	});
}
