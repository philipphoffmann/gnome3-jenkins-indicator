/**
 * @author Philipp Hoffmann
 */

const Lang = imports.lang;
const PopupMenu = imports.ui.popupMenu;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const JobPopupMenuItem = Me.imports.lib.jobPopupMenuItem;

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
				this.addMenuItem(new JobPopupMenuItem.JobPopupMenuItem(this, new_jobs[i], this.notification_source, this.settings, this.httpSession), i+2);
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

