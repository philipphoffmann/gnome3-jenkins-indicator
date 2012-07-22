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

// set text domain for localized strings
const Gettext = imports.gettext.domain('jenkins-indicator');
const _ = Gettext.gettext;

// import convenience module (for localization)
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

let _indicator, settings;

const _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());

// mapping of jenkins job states to css icon classes, feel free to add more here
function mapColor2IconClass(color) {
	if( color=='disabled' ) 	return 'icon-grey';
	if( color=='grey' ) 		return 'icon-grey';
	if( color=='blue' ) 		return 'icon-blue';
	if( color=='yellow' ) 		return 'icon-yellow';
	if( color=='red' ) 			return 'icon-red';
	if( color=='blue_anime' ) 	return 'icon-clock';
	else						{ global.log('unkown color: ' + color); return 'icon-grey'; }
}

function urlAppend(domain, uri)
{
	if( domain.length>=1 )
		return domain + (domain.charAt(domain.length-1)!='/' ? '/' : '') + uri;
	else
		return uri;
}

// represent a job in the popup menu with icon and job name
const JobPopupMenuItem = new Lang.Class({
	Name: 'JobPopupMenuItem',
	Extends: PopupMenu.PopupBaseMenuItem,

    _init: function(icon_class, text, params) {
    	this.parent(params);

        this.box = new St.BoxLayout({ style_class: 'popup-combobox-item' });
        this.icon = new St.Icon({ icon_name: 'job-icon-'+text, icon_type: St.IconType.SYMBOLIC, style_class: icon_class });
		this.label = new St.Label({ text: text });
		
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
	updateJob: function(job_state) {
		this.label.text = job_state.name;
		this.icon.style_class = mapColor2IconClass(job_state.color);
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
				this.addMenuItem(new JobPopupMenuItem(mapColor2IconClass(new_jobs[i].color), new_jobs[i].name), i);
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
    	
    	this.autoRefresh = true;

		// start off with a blue icon
        this._iconActor = new St.Icon({ icon_name: "gnome-jenkins-icon",
                                        icon_type: St.IconType.SYMBOLIC,
                                        style_class: mapColor2IconClass("blue") });
        this.actor.add_actor(this._iconActor);
        
        // add jobs popup menu
		this.setMenu(new JobPopupMenu(this.actor, 0.25, St.Side.TOP, 0));
		
		// add switch for autorefresh mode
		this._switch_autorefresh = new PopupMenu.PopupSwitchMenuItem(_("auto-refresh"), this.autoRefresh);
		this._switch_autorefresh.connect("toggled", function(){
			// toggle autoRefresh state
			_indicator.autoRefresh = !_indicator.autoRefresh;
			
			// try to restart refresh-loop
			loop();
		});
		this.menu.addMenuItem(this._switch_autorefresh);
		
		// add link to settings dialog
		this._menu_settings = new PopupMenu.PopupMenuItem(_("settings"));
		this._menu_settings.connect("activate", function(){
			// call gnome settings tool for this extension
			let app = Shell.AppSystem.get_default().lookup_app("gnome-shell-extension-prefs.desktop");
			if( app!=null ) app.activate();
		});
		this.menu.addMenuItem(this._menu_settings);
        
        // refresh when indicator is clicked
        this.actor.connect("button-press-event", Lang.bind(this, this.request));
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
	_update: function(state) {
		state = state || {jobs:[]};
		// update popup menu
		this.menu.updateJobs(state.jobs);
		
		// update indicator icon
		
		// default css icon class of indicator
		let newIconClass = "icon-blue";

		// set icon to red if provided state is not valid
		if( state==undefined || state==null || state.jobs==null || state.jobs.length<=0 )
			newIconClass = "icon-red";
		else
		{
			// determine jobs overall state for the indicator
			for( let i=0 ; i<state.jobs.length ; ++i )
			{
				if( state.jobs[i].color=="blue_anime" ) { newIconClass = mapColor2IconClass(state.jobs[i].color); break; }
				if( state.jobs[i].color=="red" ) 		{ newIconClass = mapColor2IconClass(state.jobs[i].color); break; }
				if( state.jobs[i].color=="yellow" ) 	{ newIconClass = mapColor2IconClass(state.jobs[i].color); break; }
			}
		}

		// set new indicator icon representing current jenkins state
		this._iconActor.style_class = newIconClass;
	},
	
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
		
		// set indicator state to red
		this._iconActor.style_class = "icon-red";
	}
});

// main loop for auto-refreshing
function loop() {
	if( _indicator.autoRefresh )
	{
		// refresh indicator state
		_indicator.request();

		// back to main loop after timeout
		Mainloop.timeout_add(settings.get_int("autorefresh-interval")*1000, loop);
	}
}

function init() {
	// load localization dictionaries
	Convenience.initLocalization();
	
	// load extension settings
	settings = Convenience.getSettings();
}

function enable() {
	// create indicator and add to status area
	_indicator = new JenkinsIndicator;	
    Main.panel.addToStatusArea("jenkins-indicator", _indicator);
    
    // enter auto-refresh loop
    loop();
}

function disable() {
    _indicator.destroy();
}
