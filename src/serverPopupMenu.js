/**
 * @author Philipp Hoffmann
 */

const Lang = imports.lang;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const Gtk = imports.gi.Gtk;
const PopupMenu = imports.ui.popupMenu;
const Config = imports.misc.config;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const ServerPopupMenuItem = Me.imports.src.serverPopupMenuItem;
const JobPopupMenuItem = Me.imports.src.jobPopupMenuItem;
const PopupMenuScrollSection = Me.imports.src.popupMenuScrollSection;
const Utils = Me.imports.src.helpers.utils;

// set text domain for localized strings
const _ = imports.gettext.domain(Me.metadata['gettext-domain']).gettext;

/*
 * Manages jobs popup menu items.
 */
const ServerPopupMenu = new Lang.Class({
	Name: 'ServerPopupMenu',
	Extends: PopupMenu.PopupMenu,

	_init: function(indicator, sourceActor, arrowAlignment, arrowSide, notification_source, settings, httpSession) {
		this.parent(sourceActor, arrowAlignment, arrowSide);
		
		this.indicator = indicator;
		this.notification_source = notification_source;
		this.settings = settings;
		this.httpSession = httpSession;

		// add server menu item
		this.serverMenuItem = new ServerPopupMenuItem.ServerPopupMenuItem(this.settings);
		this.addMenuItem(this.serverMenuItem);

		// add seperator to popup menu
		this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

		this.jobSection = new PopupMenuScrollSection.PopupMenuScrollSection();

		this.addMenuItem(this.jobSection);

		// add seperator to popup menu
		this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

		// add link to settings dialog
		this._menu_settings = new PopupMenu.PopupMenuItem(_("Settings"));
		this._menu_settings.connect("activate", function(){
			// call gnome settings tool for this extension
			let app = Shell.AppSystem.get_default().lookup_app("gnome-shell-extension-prefs.desktop");
			if( app!=null ) {
				// for Gnome >= 3.12
				if( Utils.versionIsAtLeast(Config.PACKAGE_VERSION, "3.12") ) {
					let info = app.get_app_info();
	 				let timestamp = global.display.get_current_time_roundtrip();
					info.launch_uris([Me.uuid], global.create_app_launch_context(timestamp, -1));
				}
				// for Gnome < 3.12
				else {
					app.launch(global.display.get_current_time_roundtrip(), ['extension:///' + Me.uuid], -1, null);
				}
			}
		});
		this.addMenuItem(this._menu_settings);
	},

	// insert, delete and update all job items in popup menu
	updateJobs: function(new_jobs) {
		// provide error message if no jobs were found
		if( new_jobs.length==0 ) {
			this.indicator.showError(_("No jobs found"));
			return;
		}
		
		// remove previous error message
		if( this.jobSection.firstMenuItem && this.jobSection.firstMenuItem instanceof PopupMenu.PopupMenuItem ) {
			this.jobSection.firstMenuItem.destroy();
		}

		// check all new job items
		for( let i=0 ; i<new_jobs.length ; ++i ) {

			// try to find matching job
			let matching_job = null;
			for( let j = 0 ; j<this.jobSection.numMenuItems ; ++j )	{
				if( new_jobs[i].name==this.jobSection._getMenuItems()[j].getJobName() )	{
					// we found a matching job
					matching_job = this.jobSection._getMenuItems()[j];
					break;
				}
			}

			// update matched job
			if( matching_job!=null ) {
				matching_job.updateJob(new_jobs[i]);
			}
			// otherwise insert as new job
			else {
				this.jobSection.addMenuItem( new JobPopupMenuItem.JobPopupMenuItem(this, new_jobs[i], this.notification_source, this.settings, this.httpSession) );
			}
		}
		
		// check for jobs that need to be removed
		for( let j = 0 ; j<this.jobSection.numMenuItems ; ++j ) {
			let job_found = false;

			for( let i=0 ; i<new_jobs.length ; ++i ) {
				if( new_jobs[i].name==this.jobSection._getMenuItems()[j].getJobName() ) {
					job_found = true;
					break;
				}
			}

			// remove job if not found
			if( !job_found ) {
				this.jobSection._getMenuItems()[j].destroy();
			}
		}
	},
	
	// update settings
	updateSettings: function(settings) {
		this.settings = settings;

		this.serverMenuItem.updateSettings(this.settings);
		
		// push new settings to job menu items
		for( let j = 0 ; j<this.jobSection.numMenuItems ; ++j )	{
			if( this.jobSection._getMenuItems()[j] instanceof JobPopupMenuItem.JobPopupMenuItem ) {
				this.jobSection._getMenuItems()[j].updateSettings(this.settings);
			}
		}
	}
});

