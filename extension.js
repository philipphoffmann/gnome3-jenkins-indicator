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

// set text domain for localized strings
const Gettext = imports.gettext.domain('jenkins-indicator');
const _ = Gettext.gettext;

// import convenience module (for localization)
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

// few static settings
const iconSize = 16;

let _indicator, settings;

const _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());

// returns icons and state ranks for job states
const jobStates = new function() {
	// define job states (colors) and their corresponding icon, feel free to add more here
	// this array is also used to determine the rank of a job state, low array index refers to a high rank
	// filter refers to the name of the filter setting (whether to show matching jobs or not)
	let states = [
		{ color: 'red_anime', 		icon: 'clock', 	filter: 'show-running-jobs' },
		{ color: 'yellow_anime', 	icon: 'clock', 	filter: 'show-running-jobs' },
		{ color: 'blue_anime', 		icon: 'clock', 	filter: 'show-running-jobs' },
		{ color: 'grey_anime', 		icon: 'clock', 	filter: 'show-running-jobs' },
		{ color: 'red', 			icon: 'red', 	filter: 'show-failed-jobs' },
		{ color: 'yellow', 			icon: 'yellow', filter: 'show-unstable-jobs' },
		{ color: 'blue', 			icon: 'blue', 	filter: 'show-successful-jobs' },
		{ color: 'grey', 			icon: 'grey', 	filter: 'show-neverbuilt-jobs' },
		{ color: 'aborted', 		icon: 'grey', 	filter: 'show-aborted-jobs'},
		{ color: 'disabled', 		icon: 'grey', 	filter: 'show-disabled-jobs' }
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
	this.toggleGreenBallPlugin = function() {
		for( let i=0 ; i<states.length ; i++ )
		{
			if( states[i].color=='blue')
			{
				if (states[i].icon == 'blue')
					states[i].icon = 'green';
				else
					states[i].icon = 'blue';

				break;
			}
		}
	}
};

// append a uri to a domain regardless whether domains ends with '/' or not
function urlAppend(domain, uri)
{
	if( domain.length>=1 )
		return domain + (domain.charAt(domain.length-1)!='/' ? '/' : '') + uri;
	else
		return uri;
}

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
                             icon_size: this.ICON_SIZE });
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
                                	icon_size: iconSize,
                                	style_class: "system-status-icon" });
		this.label = new St.Label({ text: job.name });

        this.box.add(this.icon);
        this.box.add(this.label);
        this.addActor(this.box);
	},

	// clicking a job menu item opens the job in web frontend with default browser
	activate: function() {
		Gio.app_info_launch_default_for_uri(urlAppend(settings.get_string("jenkins-url"), 'job/' + this.getJobName()), global.create_app_launch_context());
	},

	// return job name
	getJobName: function() {
		return this.label.text;
	},

	// update menu item text and icon
	updateJob: function(job) {
		// notification for finished job if job icon used to be clock (if enabled in settings)
		if( settings.get_boolean('notification-finished-jobs') && this.icon.icon_name=='clock' && jobStates.getIcon(job.color)!='clock' )
		{
			global.log(_indicator.notification_source);
			// create notification source first time we have to display notifications
			if( _indicator.notification_source==undefined )
				_indicator.notification_source = new JobNotificationSource();
				
			// create notification for the finished job
		    let notification = new MessageTray.Notification(_indicator.notification_source, _('Job finished'), _('Your Jenkins job %s just finished building.').format(job.name));
		    
		    // use transient messages if persistent messages are disabled in settings
		    if( settings.get_boolean('stack-notifications')==false )
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

		// start off with a blue overall indicator
        this._iconActor = new St.Icon({ icon_name: jobStates.getIcon(jobStates.getDefaultState()),
                                        icon_type: St.IconType.FULLCOLOR,
                                        icon_size: iconSize,
                                        style_class: "system-status-icon" });
        this.actor.add_actor(this._iconActor);

        // add jobs popup menu
		this.setMenu(new JobPopupMenu(this.actor, 0.25, St.Side.TOP));

		// add seperator to popup menu
		this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

		// add link to settings dialog
		this._menu_settings = new PopupMenu.PopupMenuItem(_("settings"));
		this._menu_settings.connect("activate", function(){
			// call gnome settings tool for this extension
			let app = Shell.AppSystem.get_default().lookup_app("gnome-shell-extension-prefs.desktop");
			if( app!=null ) {
				app.launch(global.display.get_current_time_roundtrip(), ['extension:///' + Me.uuid], -1, null);
      			}
		});
		this.menu.addMenuItem(this._menu_settings);

        // refresh when indicator is clicked
        this.actor.connect("button-press-event", Lang.bind(this, this.request));

        // we will use this later to add a notification source as soon as a notification needs to be displayed
        this.notification_source;

        // enter main loop for refreshing
        this._mainloop = Mainloop.timeout_add(settings.get_int("autorefresh-interval")*1000, Lang.bind(this, function(){
        	// request new job states if auto-refresh is enabled
        	if( settings.get_boolean("autorefresh") )
        		this.request();

        	// returning true is important for restarting the mainloop after timeout
        	return true;
        }));
    },

	// request local jenkins server for current state
	request: function() {
		// ajax request to local jenkins server
		let request = Soup.Message.new('GET', urlAppend(settings.get_string("jenkins-url"), 'api/json'));
		if( request )
		{
			_httpSession.queue_message(request, function(_httpSession, message) {
				// http error
				if( message.status_code!==200 )
				{
					_indicator.showError("invalid Jenkins CI Server web frontend URL");
				}
				// http ok
				else
				{
					// parse json
					let jenkinsState = JSON.parse(request.response_body.data);

					// update indicator icon and popupmenu contents
					_indicator._update(jenkinsState);
				}
			});
		}
		// no valid url was provided in settings dialog
		else
		{
			this.showError("invalid Jenkins CI Server web frontend URL");
		}
	},

	// update indicator icon and popupmenu contents
	_update: function(jenkinsState) {
		jenkinsState 		= jenkinsState || {};
		jenkinsState.jobs 	= jenkinsState.jobs || [];

		// filter jobs to be shown
		jenkinsState.jobs = this._filterJobs(jenkinsState.jobs);

		// update popup menu
		this.menu.updateJobs(jenkinsState.jobs);

		// update overall indicator icon

		// default state of overall indicator
		let overallState = jobStates.getDefaultState();

		// set state to red if there are no jobs
		if( jenkinsState.jobs.length<=0 )
			overallState = jobStates.getErrorState();
		else
		{
			// determine jobs overall state for the indicator
			for( let i=0 ; i<jenkinsState.jobs.length ; ++i )
			{
				// set overall job state to highest ranked (most important) state
				if( jobStates.getRank(jenkinsState.jobs[i].color)>-1 && jobStates.getRank(jenkinsState.jobs[i].color)<jobStates.getRank(overallState) )
					overallState = jenkinsState.jobs[i].color;
			}
		}

		// set new overall indicator icon representing current jenkins state
		this._iconActor.icon_name = jobStates.getIcon(overallState);
	},

	// filters jobs according to filter settings
	_filterJobs: function(jobs) {
		jobs = jobs || [];

		for( var i=0 ; i<jobs.length ; ++i )
		{
			// filter job if user decided not to show jobs with this state (in settings dialog)
			if( !settings.get_boolean(jobStates.getFilter(jobs[i].color)) )
			{
				jobs.splice(i,1);
				--i;
			}
		}

		return jobs;
	},

	// displays an error message in the popup menu
	showError: function(text) {
		// set default error message if none provided
		text = text || "unknown error";

		// remove all job menu entries and previous error messages
		if( this.menu._getMenuItems().length>2 )
		{
			for( let i=0 ; i<this.menu._getMenuItems().length-1 ; ++i )
				this.menu._getMenuItems()[0].destroy();
		}

		// show error message in popup menu
		this.menu.addMenuItem(new PopupMenu.PopupMenuItem(_("Error") + ": " + _(text), {style_class: 'error'}), 0);

		// set indicator state to error
		this._iconActor.icon_name = jobStates.getIcon(jobStates.getErrorState());
	},

	// destroys the indicator
	destroy: function() {
		// destroy the mainloop used for updating the indicator
		Mainloop.source_remove(this._mainloop);
		
		// destroy notification source
		this.notification_source.destroy();

		// call parent destroy function
		this.parent();
	}
});

function init(extensionMeta) {
	// load localization dictionaries
	Convenience.initTranslations('jenkins-indicator');

	// load extension settings
	settings = Convenience.getSettings('org.gnome.shell.extensions.jenkins-indicator');

	// start off with green icons if green balls plugin is enabled
	if (settings.get_boolean('green-balls-plugin'))
		jobStates.toggleGreenBallPlugin();

	// enable/disable green balls plugin if setting changed
	settings.connect('changed::green-balls-plugin', Lang.bind(this, jobStates.toggleGreenBallPlugin));

	// add include path for icons
	let theme = imports.gi.Gtk.IconTheme.get_default();
    theme.append_search_path(extensionMeta.path + "/icons");
}

function enable() {
	// create indicator and add to status area
	_indicator = new JenkinsIndicator;
    Main.panel.addToStatusArea("jenkins-indicator", _indicator);
}

function disable() {
    _indicator.destroy();
}
