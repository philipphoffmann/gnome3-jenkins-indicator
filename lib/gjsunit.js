// This file is part of the gjsunit framework
// Please visit https://github.com/philipphoffmann/gjsunit for more information

imports.searchPath.push('.');
imports.searchPath.push('/usr/share/gnome-js');
imports.searchPath.push('/usr/share/gnome-shell/js');

var countTestsOverall = 0;
var countTestsFailed = 0;

window.describe = function(moduleName, callback) {
	print('\n' + moduleName);
	callback();
};

window.it = function(expectation, callback) {
	try {
		callback();
		print('  \x1B[32m✔\x1B[39m \x1B[90m' + expectation + '\x1B[39m');
	}
	catch(e) {
		print('  \x1B[31m❌\x1B[39m \x1B[90m' + expectation + '\x1B[39m');
		print('\x1B[31m' + e.message + '\x1B[39m');
	}
}

window.expect = function(actualValue) {

	function MatcherFactory(actualValue, positive) {
		function triggerResult(success, msg) {
			if( (success && !positive) ||
				(!success && positive) ) {
				++countTestsFailed;
				throw new Error(msg);
			}
		}

		return {
			to: function(callback) {
				triggerResult(callback(actualValue),
					'      Expected callback to validate'
				);
			},
			toBe: function(expectedValue) {
				triggerResult(actualValue === expectedValue,
					'      Expected values to match using ===\n' +
					'      Expected: ' + expectedValue + '\n' +
					'      Actual: ' + actualValue
				);
			},
			toEqual: function(expectedValue) {
				triggerResult(actualValue == expectedValue,
					'      Expected values to match using ==\n' +
					'      Expected: ' + expectedValue + '\n' +
					'      Actual: ' + actualValue
				);
			},
			toMatch: function(expectedValue) {
				triggerResult(!!actualValue.match(expectedValue),
					'      Expected values to match using regular expression\n' +
					'      Expression: ' + expectedValue + '\n' +
					'      Actual: ' + actualValue
				);
			},
			toBeDefined: function() {
				triggerResult(typeof actualValue !== 'undefined',
					'      Expected value to be defined'
				);
			},
			toBeUndefined: function() {
				triggerResult(typeof actualValue === 'undefined',
					'      Expected value to be undefined'
				);
			},
			toBeNull: function() {
				triggerResult(actualValue === null,
					'      Expected value to be null'
				);
			},
			toBeTruthy: function() {
				triggerResult(actualValue,
					'      Expected value to be truthy'
				);
			},
			toBeFalsy: function() {
				triggerResult(!actualValue,
					'      Expected value to be falsy'
				);
			},
			toContain: function(needle) {
				triggerResult(actualValue instanceof Array && actualValue.indexOf(needle) !== -1,
					'      Expected ' + actualValue + ' to contain ' + needle
				);
			},
			toBeLessThan: function(greaterValue) {
				triggerResult(actualValue < greaterValue,
					'      Expected ' + actualValue + ' to be less than ' + greaterValue
				);
			},
			toBeGreaterThan: function(smallerValue) {
				triggerResult(actualValue > smallerValue,
					'      Expected ' + actualValue + ' to be greater than ' + smallerValue
				);
			},
			toBeCloseTo: function(expectedValue, precision) {
				var shiftHelper = Math.pow(10, precision);
				triggerResult(Math.round(actualValue * shiftHelper) / shiftHelper === Math.round(expectedValue * shiftHelper) / shiftHelper,
					'      Expected ' + actualValue + ' with precision ' + precision + ' to be close to ' + expectedValue
				);
			},
			toThrow: function() {
				var didThrow = false;
				try {
					actualValue();
					didThrow = false;
				}
				catch(e) {
					didThrow = true;
				}

				triggerResult(didThrow,
					'      Expected ' + actualValue.name + ' to throw an exception'
				);
			}
		};
	}

	++countTestsOverall;

	var expecter = new MatcherFactory(actualValue, true);
	expecter.not = new MatcherFactory(actualValue, false);

	return expecter;
}

var runTests = function(namespace) {
	// recursively check the test directory for executable tests
	for( var subNamespace in namespace ) {

		// execute any test functions
		if( subNamespace === 'testSuite' && typeof namespace[subNamespace] === 'function' ) {
			namespace[subNamespace]();
		}
		// descend into subfolders and objects
		else if( typeof namespace[subNamespace] === 'object' ) {
			runTests(namespace[subNamespace]);
		}
	}
}

// by default we run tests from the 'test' directory
var testDir = 'test';
var knownDirs = [];

// scan all modules we can import
for( var dir in imports ) {
	knownDirs.push(dir);
}

// if the provided argument is amongst the known modules, use that module as the test root
if( ARGV[0] && knownDirs.indexOf(ARGV[0]) !== -1 ) {
	testDir = ARGV[0];
}

// run tests from the test root
runTests(imports[testDir]);

if( countTestsFailed ) {
	// some tests failed
	print('\n\x1B[31m❌ ' + countTestsFailed + ' of ' + countTestsOverall + ' tests failed\x1B[39m');
}
else {
	// all tests okay
	print('\n\x1B[32m✔ ' + countTestsOverall + ' completed\x1B[39m');
}

print();
