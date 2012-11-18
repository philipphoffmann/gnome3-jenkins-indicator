/**
 * @author Philipp Hoffmann
 */

const Lang = imports.lang;
const St = imports.gi.St;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Gio = imports.gi.Gio;
const Shell = imports.gi.Shell;
const Soup = imports.gi.Soup;
const Glib = imports.gi.GLib;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

// import convenience module (for localization)
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Settings = Me.imports.settings;
const Utils = Me.imports.lib.utils;
const ServerPopupMenuItem = Me.imports.lib.serverPopupMenuItem;
const JobPopupMenuItem = Me.imports.lib.jobPopupMenuItem;

// set text domain for localized strings
const _ = imports.gettext.domain(Me.metadata['gettext-domain']).gettext;

let _indicators = [];
let settings, settingsJSON;

// signals container (for clean disconnecting from signals if extension gets disabled)
let event_signals = [];

const _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());

// manages jobs popup menu items
const ServerPopupMenu = new Lang.Class({
	Name: 'ServerPopupMenu',
	Extends: PopupMenu.PopupMenu,

	_init: function(indicator, sourceActor, arrowAlignment, arrowSide, notification_source, settings) {
		this.parent(sourceActor, arrowAlignment, arrowSide);
		
		this.indicator = indicator;
		this.notification_source = notification_source;
		this.settings = settings;
	},

	// insert, delete and update all job items in popup menu
	updateJobs: function(new_jobs) {
		// provide error message if no jobs were found
		if( new_jobs.length==0 )
		{
			this.indicator.showError(_("No jobs found"));
			return;
		}

		// remove previous error message
		if( this._getMenuItems().length==5 && this._getMenuItems()[2] instanceof PopupMenu.PopupMenuItem )
			this._getMenuItems()[2].destroy();

		// check all new job items
		for( let i=0 ; i<new_jobs.length ; ++i )
		{
			// try to find matching job
			let matching_job = null;
			for( let j = 2 ; j<this._getMenuItems().length-2 ; ++j )
			{
				if( new_jobs[i].name==this._getMenuItems()[j].getJobName() )
				{
					// we found a matching job
					matching_job = this._getMenuItems()[j];
					break;
				}
			}

			// update matched job
			if( matching_job!=null )
			{
				matching_job.updateJob(new_jobs[i]);
			}
			// otherwise insert as new job
			else
			{
				this.addMenuItem(new JobPopupMenuItem.JobPopupMenuItem(this, new_jobs[i], this.notification_source, this.settings, _httpSession), i+2);
			}
		}
		
    	// check for jobs that need to be removed
		for( let j = 2 ; j<this._getMenuItems().length-2 ; ++j )
		{
			let job_found = false;
			for( let i=0 ; i<new_jobs.length ; ++i )
			{
				if( new_jobs[i].name==this._getMenuItems()[j].getJobName() )
				{
					job_found = true;
					break;
				}
			}

			// remove job if not found
			if( !job_found )
			{
				this._getMenuItems()[j].destroy();
			}
		}
	},
	
	// update settings
	updateSettings: function(settings) {
	    this.settings = settings;
	    
	    // push new settings to job menu items
	    for( let j = 2 ; j<this._getMenuItems().length-2 ; ++j )
	        this._getMenuItems()[j].updateSettings(this.settings);
	}
});

// represents the indicator in the top menu bar
const JenkinsIndicator = new Lang.Class({
    Name: 'JenkinsIndicator',
    Extends: PanelMenu.Button,

    _init: function(settings) {
    	this.parent(0.25, "Jenkins Indicator", false );
    	
    	// the number of the server this indicator refers to
    	this.settings = settings;
    	
    	// start off with no jobs to display
    	this.jobs = [];
    	
    	// we will use this later to add a notification source as soon as a notification needs to be displayed
        this.notification_source;
    	
    	// lock used to prevent multiple parallel update requests
    	this._isRequesting = false;
    	
		// start off with a blue overall indicator
        this._iconActor = Utils.createStatusIcon(Utils.jobStates.getIcon(Utils.jobStates.getDefaultState(), this.settings.green_balls_plugin));
        this.actor.add_actor(this._iconActor);

        // add jobs popup menu
		this.setMenu(new ServerPopupMenu(this, this.actor, 0.25, St.Side.TOP, this.notification_source, this.settings));

		// add server menu item
		this.serverMenuItem = new ServerPopupMenuItem.ServerPopupMenuItem(this.settings, event_signals);
		this.menu.addMenuItem(this.serverMenuItem);
		
		// add seperators to popup menu
		this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
		this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

		// add link to settings dialog
		this._menu_settings = new PopupMenu.PopupMenuItem(_("Settings"));
		event_signals.push( this._menu_settings.connect("activate", function(){
			// call gnome settings tool for this extension
			let app = Shell.AppSystem.get_default().lookup_app("gnome-shell-extension-prefs.desktop");
			if( app!=null )
				app.launch(global.display.get_current_time_roundtrip(), ['extension:///' + Me.uuid], -1, null);
		}) );
		this.menu.addMenuItem(this._menu_settings);

        // refresh when indicator is clicked
        event_signals.push( this.actor.connect("button-press-event", Lang.bind(this, this.request)) );

        // enter main loop for refreshing
        this._mainloopInit();
    },
    
    _mainloopInit: function() {
        // create new main loop
        this._mainloop = Mainloop.timeout_add(this.settings.autorefresh_interval*1000, Lang.bind(this, function(){
            // request new job states if auto-refresh is enabled
            if( this.settings.autorefresh )
                this.request();

            // returning true is important for restarting the mainloop after timeout
            return true;
        }));
    },

	// request local jenkins server for current state
	request: function() {
		// only update if no update is currently running
		if( !this._isRequesting )
		{
			this._isRequesting = true;
			// ajax request to local jenkins server
			let request = Soup.Message.new('GET', Utils.urlAppend(this.settings.jenkins_url, 'api/json'));
			
			// append authentication header (if necessary)
			// jenkins only supports preemptive authentication so we have to provide authentication info on first request
			if( this.settings.use_authentication )
				request.request_headers.append('Authorization', 'Basic ' + Glib.base64_encode(this.settings.auth_user + ':' + this.settings.api_token));

			if( request )
			{
				_httpSession.queue_message(request, Lang.bind(this, function(_httpSession, message) {
					// http error
					if( message.status_code!==200 )
					{
						this.showError(_("Invalid Jenkins CI Server web frontend URL (HTTP Error %s)").format(message.status_code));
					}
					// http ok
					else
					{
						// parse json
						let jenkinsState = JSON.parse(request.response_body.data);
	
						// update jobs
						this.jobs = jenkinsState.jobs;
						
						// update indicator (icon and popupmenu contents)
						this.update();
					}
					
					// we're done updating and ready for the next request
					this._isRequesting = false;
				}));
			}
			// no valid url was provided in settings dialog
			else
			{
				this.showError(_("Invalid Jenkins CI Server web frontend URL"));
				
				// we're done updating and ready for the next request
				this._isRequesting = false;
			}
		}
	},

	// update indicator icon and popupmenu contents
	update: function() {
		// filter jobs to be shown
		let displayJobs = this._filterJobs(this.jobs);

		// update popup menu
		this.menu.updateJobs(displayJobs);

		// update overall indicator icon

		// default state of overall indicator
		let overallState = Utils.jobStates.getDefaultState();

		// set state to red if there are no jobs
		if( displayJobs.length<=0 )
			overallState = Utils.jobStates.getErrorState();
		else
		{
			// determine jobs overall state for the indicator
			for( let i=0 ; i<displayJobs.length ; ++i )
			{
				// set overall job state to highest ranked (most important) state
				if( Utils.jobStates.getRank(displayJobs[i].color)>-1 && Utils.jobStates.getRank(displayJobs[i].color)<Utils.jobStates.getRank(overallState) )
					overallState = displayJobs[i].color;
			}
		}

		// set new overall indicator icon representing current jenkins state
		this._iconActor.icon_name = Utils.jobStates.getIcon(overallState, this.settings.green_balls_plugin);
	},

	// filters jobs according to filter settings
	_filterJobs: function(jobs) {
		jobs = jobs || [];
		let filteredJobs = [];
		let jobToShow = this.settings['jobs_to_show'].trim().split(",");
		let showAllJobs =  (jobToShow.length == 1) && jobToShow[0] == "all";

		for( var i=0 ; i<jobs.length ; ++i )
		{
			// filter job if user decided not to show jobs with this state (in settings dialog)
			let filterJobState = this.settings[Utils.jobStates.getFilter(jobs[i].color)];
			// filter job if user decided not to show jobs with this name (in settings dialog)
			let filterJobByName = showAllJobs || jobToShow.indexOf(jobs[i].name) >= 0;
			if(filterJobState && filterJobByName){
				filteredJobs[filteredJobs.length] = jobs[i];
			}

		}

		return filteredJobs;
	},
	
	// update settings
	updateSettings: function(settings) {
	    this.settings = settings;
	    
	    // update server menu item
	    this.menu.updateSettings(this.settings);
	    this.serverMenuItem.updateSettings(this.settings);
	    
	    // refresh main loop
	    Mainloop.source_remove(this._mainloop);
	    this._mainloopInit();

	    this.update();
	},

	// displays an error message in the popup menu
	showError: function(text) {
		// set default error message if none provided
		text = text || "unknown error";

		// remove all job menu entries and previous error messages
		while( this.menu._getMenuItems().length>4 )
			this.menu._getMenuItems()[2].destroy();

		// show error message in popup menu
		this.menu.addMenuItem(new PopupMenu.PopupMenuItem(_("Error") + ": " + text, {style_class: 'error'}), 2);

		// set indicator state to error
		this._iconActor.icon_name = Utils.jobStates.getIcon(Utils.jobStates.getErrorState(), this.settings.green_balls_plugin);
	},

	// destroys the indicator
	destroy: function() {
		// destroy the mainloop used for updating the indicator
		Mainloop.source_remove(this._mainloop);
		
		// destroy notification source if used
		if( this.notification_source )
			this.notification_source.destroy();

		// call parent destroy function
		this.parent();
	}
});

function createIndicator(server_num)
{
    // create indicator and add to status area
    _indicators[server_num] = new JenkinsIndicator(settingsJSON['servers'][server_num]);
    Main.panel.addToStatusArea("jenkins-indicator-"+settingsJSON['servers'][server_num]['id'], _indicators[server_num]);
}

function init(extensionMeta) {
    // add include path for icons
    let theme = imports.gi.Gtk.IconTheme.get_default();
    theme.append_search_path(extensionMeta.path + "/icons");

    // load localization dictionaries
    Convenience.initTranslations();

    // load extension settings
    settings = Convenience.getSettings();
    settingsJSON = Settings.getSettingsJSON(settings);
}

function enable() {
    // we need to add indicators in reverse order so they appear from left to right
	for( let i=settingsJSON['servers'].length-1 ; i>=0 ; --i )
        createIndicator(i);
    
    // react to changing settings by adding/removing indicators if necessary
    event_signals.push( settings.connect('changed::settings-json', function(){
        settingsJSON_old = settingsJSON;
        settingsJSON = Settings.getSettingsJSON(settings);

        // destroy deleted indicators
        Utils.arrayOpCompare(settingsJSON_old['servers'], settingsJSON['servers'], function(a, b){
            return a['id']==b['id'];
        }, function(index, element){
            _indicators[index].destroy();
            _indicators.splice(index,1);
        });
        
        // create new indicators
        Utils.arrayOpCompare(settingsJSON['servers'], settingsJSON_old['servers'], function(a, b){
            return a['id']==b['id'];
        }, function(index, element){
            createIndicator(index);
        });
        
        // update all indicators
        for( let i=0 ; i<_indicators.length ; ++i )
        {
            _indicators[i].updateSettings(settingsJSON['servers'][i]);
            _indicators[i].request();
        }
    }) );
}

function disable() {
    for( var i=0 ; i<_indicators.length ; ++i )
        _indicators[i].destroy();

    _indicators = [];
    
    // disconnect all signal listeners
    for( var i=0 ; i<event_signals.length ; ++i )
    	settings.disconnect(event_signals[i]);
}
