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
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const MessageTray = imports.ui.messageTray;

// this is the messagetray of the current session
const SessionMessageTray = imports.ui.main.messageTray;

// import convenience module (for localization)
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

// set text domain for localized strings
const _ = imports.gettext.domain(Me.metadata['gettext-domain']).gettext;

// few static settings
const ICON_SIZE_INDICATOR = 16;
const ICON_SIZE_NOTIFICATION = 24;

let _indicator, settings, settingsJSON;

// signals container (for clean disconnecting from signals if extension gets disabled)
let event_signals = [];

const _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());

// append a uri to a domain regardless whether domains ends with '/' or not
function urlAppend(domain, uri)
{
	if( domain.length>=1 )
		return domain + (domain.charAt(domain.length-1)!='/' ? '/' : '') + uri;
	else
		return uri;
}

// returns icons and state ranks for job states
const jobStates = new function() {
	// define job states (colors) and their corresponding icon, feel free to add more here
	// this array is also used to determine the rank of a job state, low array index refers to a high rank
	// filter refers to the name of the filter setting (whether to show matching jobs or not)
	// name is used for notifications about job changes
	let states = [
		{ color: 'red_anime', 		icon: 'clock', 	filter: 'show_running_jobs', 	name: 'running' },
		{ color: 'yellow_anime', 	icon: 'clock', 	filter: 'show_running_jobs', 	name: 'running' },
		{ color: 'blue_anime', 		icon: 'clock', 	filter: 'show_running_jobs', 	name: 'running' },
		{ color: 'grey_anime', 		icon: 'clock', 	filter: 'show_running_jobs', 	name: 'running' },
		{ color: 'red', 			icon: 'red', 	filter: 'show_failed_jobs',		name: 'failed' },
		{ color: 'yellow', 			icon: 'yellow', filter: 'show_unstable_jobs',	name: 'unstable' },
		{ color: 'blue', 			icon: 'blue', 	filter: 'show_successful_jobs', name: 'successful' },
		{ color: 'grey', 			icon: 'grey', 	filter: 'show_neverbuilt_jobs', name: 'never built' },
		{ color: 'aborted', 		icon: 'grey', 	filter: 'show_aborted_jobs',	name: 'aborted' },
		{ color: 'disabled', 		icon: 'grey', 	filter: 'show_disabled_jobs',	name: 'disabled' }
	];

	// returns the rank of a job state, highest rank is 0, -1 means that the job state is unknown
	// this is used to determine the state of the overall indicator which shows the state of the highest ranked job
	this.getRank = function(job_color)
	{
		for( let i=0 ; i<states.length ; ++i )
		{
			if( job_color==states[i].color ) return i;
		}
		return -1;
	};

	// returns the corresponding icon name of a job state
	this.getIcon = function(job_color)
	{
		for( let i=0 ; i<states.length ; ++i )
		{
			if( job_color==states[i].color ) return states[i].icon;
		}
		// if job color is unknown, use the grey icon
		global.log('unkown color: ' + job_color);
		return 'grey';
	};

	// returns the corresponding icon name of a job state
	this.getFilter = function(job_color)
	{
		for( let i=0 ; i<states.length ; ++i )
		{
			if( job_color==states[i].color ) return states[i].filter;
		}
		// if job color is unknown, use the filter setting for disabled jobs
		global.log('unkown color: ' + job_color);
		return 'show-disabled-jobs';
	};
	
	// returns the corresponding icon name of a job state
	this.getName = function(job_color)
	{
		for( let i=0 ; i<states.length ; ++i )
		{
			if( job_color==states[i].color ) return _(states[i].name);
		}
		// if job color is unknown, use the filter setting for disabled jobs
		global.log('unkown color: ' + job_color);
		return 'unknown';
	};

	// returns the default job state to use for overall indicator
	this.getDefaultState = function()
	{
		// return lowest ranked job state
		return states[states.length-1].color;
	};

	// return the color of the error state for the overall indicator
	this.getErrorState = function()
	{
		return "red";
	};

	// enables/disables the green ball plugin
	this.toggleGreenBallsPlugin = function(plugin_active) {
		for( let i=0 ; i<states.length ; i++ )
		{
			if( states[i].color=='blue')
			{
				if (plugin_active && states[i].icon == 'blue')
					states[i].icon = 'green';
				else
					states[i].icon = 'blue';

				break;
			}
		}
	}
};

// source for handling job notifications 
const JobNotificationSource = new Lang.Class({
    Name: 'JobNotificationSource',
    Extends: MessageTray.Source,

    _init: function() {
    	// set notification source title
        this.parent(_("Jenkins jobs"));

		// set notification source icon
        this._setSummaryIcon(this.createNotificationIcon());
        
        // add myself to the message try
        SessionMessageTray.add(this);
    },

	// set jenkins logo for notification source icon
    createNotificationIcon: function() {
        return new St.Icon({ icon_name: 'headshot',
                             icon_type: St.IconType.FULLCOLOR,
                             icon_size: ICON_SIZE_INDICATOR });
    },

	// gets called when a notification is clicked
    open: function(notification) {
    	// close the clicked notification
        notification.destroy();
    }
});

// represent a job in the popup menu with icon and job name
const JobPopupMenuItem = new Lang.Class({
	Name: 'JobPopupMenuItem',
	Extends: PopupMenu.PopupBaseMenuItem,

    _init: function(job, params) {
    	this.parent(params);
        this.box = new St.BoxLayout({ style_class: 'popup-combobox-item' });
        this.icon = new St.Icon({ 	icon_name: jobStates.getIcon(job.color),
                                	icon_type: St.IconType.FULLCOLOR,
                                	icon_size: ICON_SIZE_INDICATOR,
                                	style_class: "system-status-icon" });
		this.label = new St.Label({ text: job.name });

        this.box.add(this.icon);
        this.box.add(this.label);
        this.addActor(this.box);
	},

	// clicking a job menu item opens the job in web frontend with default browser
	activate: function() {
		Gio.app_info_launch_default_for_uri(urlAppend(settingsJSON['servers'][0]['jenkins_url'], 'job/' + this.getJobName()), global.create_app_launch_context());
	},

	// return job name
	getJobName: function() {
		return this.label.text;
	},

	// update menu item text and icon
	updateJob: function(job) {
		// notification for finished job if job icon used to be clock (if enabled in settings)
		if( settingsJSON['servers'][0]['notification_finished_jobs'] && this.icon.icon_name=='clock' && jobStates.getIcon(job.color)!='clock' )
		{
			// create notification source first time we have to display notifications
			if( _indicator.notification_source==undefined )
				_indicator.notification_source = new JobNotificationSource();
			
			// create notification for the finished job
		    let notification = new MessageTray.Notification(_indicator.notification_source, _('Job finished building'), _('Your Jenkins job %s just finished building (<b>%s</b>).').format(job.name, jobStates.getName(job.color)), {
		    	bannerMarkup: true,
		    	icon: new St.Icon({ icon_name: jobStates.getIcon(job.color),
                                	icon_type: St.IconType.FULLCOLOR,
                                	icon_size: ICON_SIZE_NOTIFICATION,
                                	style_class: "system-status-icon" })
		    });
		    
		    // use transient messages if persistent messages are disabled in settings
		    if( settingsJSON['servers'][0]['stack_notifications']==false )
		    	notification.setTransient(true);
		    
		    // notify the user
		    _indicator.notification_source.notify(notification);
		}
		
		this.label.text = job.name;
		this.icon.icon_name = jobStates.getIcon(job.color);
	},
	
	// destroys the job popup menu item
	destroy: function() {
		this.icon.destroy();
		this.label.destroy();
		this.box.destroy();
		
		this.parent();
	}
});

// manages jobs popup menu items
const JobPopupMenu = new Lang.Class({
	Name: 'JobPopupMenu',
	Extends: PopupMenu.PopupMenu,

	_init: function(sourceActor, arrowAlignment, arrowSide) {
		this.parent(sourceActor, arrowAlignment, arrowSide);
	},

	// insert, delete and update all job items in popup menu
	updateJobs: function(new_jobs) {
		// provide error message if no jobs were found
		if( new_jobs.length==0 )
		{
			_indicator.showError("no jobs found");
			return;
		}

		// remove previous error message
		if( this._getMenuItems().length==3 && this._getMenuItems()[0] instanceof PopupMenu.PopupMenuItem )
			this._getMenuItems()[0].destroy();

		// check all new job items
		for( let i=0 ; i<new_jobs.length ; ++i )
		{
			// try to find matching job
			let matching_job = null;
			for( let j = 0 ; j<this._getMenuItems().length-2 ; ++j )
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
				this.addMenuItem(new JobPopupMenuItem(new_jobs[i]), i);
			}
		}

		// check for jobs that need to be removed
		for( let j = 0 ; j<this._getMenuItems().length-2 ; ++j )
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
	}
});

// represents the indicator in the top menu bar
const JenkinsIndicator = new Lang.Class({
    Name: 'JenkinsIndicator',
    Extends: PanelMenu.Button,

    _init: function() {
    	this.parent(0.25, "Jenkins Indicator", false );
    	
    	// start off if no jobs to display
    	this.jobs = []
    	
    	// lock used to prevent multiple parallel update requests
    	this._isUpdating = false;

		// start off with a blue overall indicator
        this._iconActor = new St.Icon({ icon_name: jobStates.getIcon(jobStates.getDefaultState()),
                                        icon_type: St.IconType.FULLCOLOR,
                                        icon_size: ICON_SIZE_INDICATOR,
                                        style_class: "system-status-icon" });
        this.actor.add_actor(this._iconActor);

        // add jobs popup menu
		this.setMenu(new JobPopupMenu(this.actor, 0.25, St.Side.TOP));

		// add seperator to popup menu
		this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

		// add link to settings dialog
		this._menu_settings = new PopupMenu.PopupMenuItem(_("settings"));
		event_signals.push( this._menu_settings.connect("activate", function(){
			// call gnome settings tool for this extension
			let app = Shell.AppSystem.get_default().lookup_app("gnome-shell-extension-prefs.desktop");
			if( app!=null )
				app.launch(global.display.get_current_time_roundtrip(), ['extension:///' + Me.uuid], -1, null);
		}) );
		this.menu.addMenuItem(this._menu_settings);

        // refresh when indicator is clicked
        event_signals.push( this.actor.connect("button-press-event", Lang.bind(this, this.request)) );

        // we will use this later to add a notification source as soon as a notification needs to be displayed
        this.notification_source;

        // enter main loop for refreshing
        this._mainloop = Mainloop.timeout_add(settingsJSON['servers'][0]['autorefresh_interval']*1000, Lang.bind(this, function(){
        	// request new job states if auto-refresh is enabled
        	if( settingsJSON['servers'][0]['autorefresh'] )
        		this.request();

        	// returning true is important for restarting the mainloop after timeout
        	return true;
        }));
    },

	// request local jenkins server for current state
	request: function() {
		// only update if no update is currently running
		if( !this._isUpdating )
		{
			this._isUpdating = true;
			// ajax request to local jenkins server
			let request = Soup.Message.new('GET', urlAppend(settingsJSON['servers'][0]['jenkins_url'], 'api/json'));
			if( request )
			{
				_httpSession.queue_message(request, Lang.bind(this, function(_httpSession, message) {
					// http error
					if( message.status_code!==200 )
					{
						this.showError("invalid Jenkins CI Server web frontend URL");
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
					this._isUpdating = false;
				}));
			}
			// no valid url was provided in settings dialog
			else
			{
				this.showError("invalid Jenkins CI Server web frontend URL");
				
				// we're done updating and ready for the next request
				this._isUpdating = false;
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
		let overallState = jobStates.getDefaultState();

		// set state to red if there are no jobs
		if( displayJobs.length<=0 )
			overallState = jobStates.getErrorState();
		else
		{
			// determine jobs overall state for the indicator
			for( let i=0 ; i<displayJobs.length ; ++i )
			{
				// set overall job state to highest ranked (most important) state
				if( jobStates.getRank(displayJobs[i].color)>-1 && jobStates.getRank(displayJobs[i].color)<jobStates.getRank(overallState) )
					overallState = displayJobs[i].color;
			}
		}

		// set new overall indicator icon representing current jenkins state
		this._iconActor.icon_name = jobStates.getIcon(overallState);
	},

	// filters jobs according to filter settings
	_filterJobs: function(jobs) {
		jobs = jobs || [];
		let filteredJobs = [];

		for( var i=0 ; i<jobs.length ; ++i )
		{
			// filter job if user decided not to show jobs with this state (in settings dialog)
			if( settingsJSON['servers'][0][jobStates.getFilter(jobs[i].color)] )
				filteredJobs[filteredJobs.length] = jobs[i]
		}

		return filteredJobs;
	},

	// displays an error message in the popup menu
	showError: function(text) {
		// set default error message if none provided
		text = text || "unknown error";

		// remove all job menu entries and previous error messages
		while( this.menu._getMenuItems().length>2 )
			this.menu._getMenuItems()[0].destroy();

		// show error message in popup menu
		this.menu.addMenuItem(new PopupMenu.PopupMenuItem(_("Error") + ": " + _(text), {style_class: 'error'}), 0);

		// set indicator state to error
		this._iconActor.icon_name = jobStates.getIcon(jobStates.getErrorState());
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

function init(extensionMeta) {
	// add include path for icons
	let theme = imports.gi.Gtk.IconTheme.get_default();
    theme.append_search_path(extensionMeta.path + "/icons");
    
    // load localization dictionaries
	Convenience.initTranslations();
    
    // load extension settings
	settings = Convenience.getSettings();
	settingsJSON = JSON.parse(settings.get_string("settings-json"));
}

function enable() {
	// start off with green icons if green balls plugin is enabled
	if( settingsJSON['servers'][0]['green_balls_plugin'] )
	   jobStates.toggleGreenBallsPlugin(true);
		
	// create indicator and add to status area
	_indicator = new JenkinsIndicator;
    Main.panel.addToStatusArea("jenkins-indicator", _indicator);
    
    // update settings json object when settings change
    event_signals.push( settings.connect('changed::settings-json', Lang.bind(_indicator, function(){
        settingsJSON = JSON.parse(settings.get_string("settings-json"));
        
        jobStates.toggleGreenBallsPlugin(settingsJSON['servers'][0]['green_balls_plugin']);
        
        _indicator.update();
        _indicator.request();
    })) );
}

function disable() {
    _indicator.destroy();
    
    // disconnect all signal listeners
    for( var i=0 ; i<event_signals.length ; ++i )
    	settings.disconnect(event_signals[i]);
}
