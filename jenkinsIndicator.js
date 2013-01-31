/**
 * @author Philipp Hoffmann
 */

const Lang = imports.lang;
const St = imports.gi.St;
const Mainloop = imports.mainloop;
const Glib = imports.gi.GLib;
const Soup = imports.gi.Soup;
const PopupMenu = imports.ui.popupMenu;
const PanelMenu = imports.ui.panelMenu;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const ServerPopupMenu = Me.imports.serverPopupMenu;

// set text domain for localized strings
const _ = imports.gettext.domain(Me.metadata['gettext-domain']).gettext;

/*
 * Represents the indicator in the top menu bar.
 */
const JenkinsIndicator = new Lang.Class({
    Name: 'JenkinsIndicator',
    Extends: PanelMenu.Button,

    _init: function(settings, httpSession) {
    	this.parent(0.25, "Jenkins Indicator", false );
    	
    	// the number of the server this indicator refers to
    	this.settings = settings;
		this.httpSession = httpSession;
    	
    	// start off with no jobs to display
    	this.jobs = [];
    	
    	// we will use this later to add a notification source as soon as a notification needs to be displayed
        this.notification_source;
    	
    	// lock used to prevent multiple parallel update requests
    	this._isRequesting = false;
    	
		// start off with a blue overall indicator
        this._iconActor = Utils.createStatusIcon(Utils.jobStates.getIcon(Utils.jobStates.getDefaultState(), this.settings.green_balls_plugin));
        this.actor.add_actor(this._iconActor);

        // add server popup menu
		this.setMenu(new ServerPopupMenu.ServerPopupMenu(this, this.actor, 0.25, St.Side.TOP, this.notification_source, this.settings, this.httpSession));

        // refresh when indicator is clicked
        this.actor.connect("button-press-event", Lang.bind(this, this.request));

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
				this.httpSession.queue_message(request, Lang.bind(this, function(httpSession, message) {
					// http error
					if( message.status_code!==200 )
					{
						this.showError(_("Invalid Jenkins CI Server web frontend URL (HTTP Error %s)").format(message.status_code));
					}
					// http ok
					else
					{
						// parse json
						try {
							let jenkinsState = JSON.parse(request.response_body.data);
	
							// update jobs
							this.jobs = jenkinsState.jobs;
							
							// update indicator (icon and popupmenu contents)
							this.update();
						}
						catch( e )
						{
							this.showError(_("Invalid Jenkins CI Server web frontend URL"));
						}
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
		let showAllJobs =  false;
	        let excludePattern = false;

		if ((jobToShow.length == 1) && jobToShow[0] == "all") {
			showAllJobs = true;
		} else {
			for (let i=0; i<jobToShow.length; i++) {
				if (jobToShow[i].indexOf("!") == 0) {
				  excludePattern = true;
				  break;
				}
			}
		}

		for( var i=0 ; i<jobs.length ; ++i )
		{
			// filter job if user decided not to show jobs with this state (in settings dialog)
			let filterJobState = this.settings[Utils.jobStates.getFilter(jobs[i].color)];
			// filter job if user decided not to show jobs with this name (in settings dialog)
			let filterJobByName = showAllJobs || (!excludePattern && jobToShow.indexOf(jobs[i].name) >= 0)
			  || (excludePattern && jobToShow.indexOf("!" + jobs[i].name) == -1);
  
			// let filterJobByName = showAllJobs || jobToShow.indexOf(jobs[i].name) >= 0;
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
		this.menu.jobSection.removeAll();

		// show error message in popup menu
		this.menu.jobSection.addMenuItem( new PopupMenu.PopupMenuItem(_("Error") + ": " + text, {style_class: 'error'}) );

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

		this.parent();
	}
});

