/*
 * @author Philipp Hoffmann
 */

const Params = imports.misc.params;

// default settings for new servers
let DefaultSettings = {
    "servers": [
        {
            "id": 1,
            "name": "Default",
            "jenkins_url": "http://localhost:8080/",
			"use_authentication": false,
			"auth_user": "",
			"api_token": "",
            "green_balls_plugin": false,

            "autorefresh": true,
            "autorefresh_interval": 5,
            
            "notification_finished_jobs": true,
            "stack_notifications": false,
            
            "show_running_jobs": true,
            "show_successful_jobs": true,
            "show_unstable_jobs": true,
            "show_failed_jobs": true,
            "show_neverbuilt_jobs": false,
            "show_disabled_jobs": false,
            "show_aborted_jobs": false,
	    "jobs_to_show": "all"
        }
    ]
}

// helper to prevent weird errors if possible settings change in future updates by using default settings
function getSettingsJSON(settings)
{
	let settingsJSON = JSON.parse(settings.get_string("settings-json"));
	
	// assert that at least default settings are available
	settingsJSON = settingsJSON || DefaultSettings;
	settingsJSON.servers = settingsJSON.servers || DefaultSettings.servers;
	
	for( let i=0 ; i<settingsJSON.servers.length ; ++i )
	{
		for( var setting in DefaultSettings.servers[0] )
		{
			if( !(setting in settingsJSON.servers[i]) )
				settingsJSON.servers[i][setting] = DefaultSettings.servers[0][setting];
		}
	}
	
	return settingsJSON;
}
