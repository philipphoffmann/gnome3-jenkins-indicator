/**
 * @author Philipp Hoffmann
 */

const Lang = imports.lang;
const St = imports.gi.St;
const PopupMenu = imports.ui.popupMenu;
const Gio = imports.gi.Gio;
const Glib = imports.gi.GLib;
const Soup = imports.gi.Soup;
const MessageTray = imports.ui.messageTray;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const JobNotificationSource = Me.imports.jobNotificationSource;

// set text domain for localized strings
const _ = imports.gettext.domain(Me.metadata['gettext-domain']).gettext;

/*
 * Represent a job in the popup menu with icon and job name.
 */
const JobPopupMenuItem = new Lang.Class({
	Name: 'JobPopupMenuItem',
	Extends: PopupMenu.PopupBaseMenuItem,

    _init: function(parentMenu, job, notification_source, settings, httpSession, params) {
    	this.parent(params);
    	
		this.parentMenu = parentMenu;
    	this.notification_source = notification_source;
    	this.settings = settings;
		this.httpSession = httpSession;
    	
        this.box = new St.BoxLayout({ style_class: 'popup-combobox-item' });

		// icon representing job state
        this.icon = Utils.createStatusIcon(Utils.jobStates.getIcon(job.color, this.settings.green_balls_plugin));
	
		// button used to trigger the job
        this.icon_build = Utils.createStatusIcon('jenkins_clock');

		this.button_build = new St.Button({ child: this.icon_build });
		
		this.button_build.connect("clicked", Lang.bind(this, function(){
			// request to trigger the build
			let request = Soup.Message.new('GET', Utils.urlAppend(this.settings.jenkins_url, 'job/' + this.getJobName() + '/build'));
			
			// append authentication header (if necessary)
			// jenkins only supports preemptive authentication (authentication on first request)
			// any request not sending an authentication header is rejected right away
			// unfortunately Soup doesnt support that, so we have to provide the authentication header manually
			if( this.settings.use_authentication )
				request.request_headers.append('Authorization', 'Basic ' + Glib.base64_encode(this.settings.auth_user + ':' + this.settings.api_token));

			if( request )
			{
				// kick off request
				this.httpSession.queue_message(request, Lang.bind(this, function(httpSession, message) {
					// we could try to refresh all jobs here but jenkins delays builds by 5 seconds so we wont see any difference
				}));
			}

			// close this menu
			this.parentMenu.close();
		}));

		// menu item label (job name)
		this.label = new St.Label({ text: job.name });

        this.box.add(this.icon);
        this.box.add(this.label);

		// For Gnome 3.8 and below
        if( typeof this.addActor != 'undefined' ) {
			this.addActor(this.box);

			// let the build button use the rest of the box and align it to the right
			this.addActor(this.button_build, {span: -1, align: St.Align.END});
		}
		// For Gnome 3.10 and above
		else {
			this.actor.add_child(this.box);

			// let the build button use the rest of the box and align it to the right
			this.actor.add_child(this.button_build, {span: -1, align: St.Align.END});
		}

        
        // clicking a job menu item opens the job in web frontend with default browser
        this.connect("activate", Lang.bind(this, function(){
            Gio.app_info_launch_default_for_uri(Utils.urlAppend(this.settings.jenkins_url, 'job/' + this.getJobName()), global.create_app_launch_context());
        }));
	},

	// return job name
	getJobName: function() {
		return this.label.text;
	},

	// update menu item text and icon
	updateJob: function(job) {
		// notification for finished job if job icon used to be clock (if enabled in settings)
		if( this.settings.notification_finished_jobs && this.icon.icon_name=='jenkins_clock' && Utils.jobStates.getIcon(job.color, this.settings.green_balls_plugin)!='jenkins_clock' )
		{
			// create notification source first time we have to display notifications or if server name changed
			if( typeof this.notification_source === 'undefined' || this.notification_source.title !== this.settings.name )
				this.notification_source = new JobNotificationSource.JobNotificationSource(this.settings.name);
			
			// create notification for the finished job
		    let notification = new MessageTray.Notification(this.notification_source, _('Job finished building'), _('Your Jenkins job %s just finished building (<b>%s</b>).').format(job.name, Utils.jobStates.getName(job.color)), {
		    	bannerMarkup: true,
		    	icon: Utils.createStatusIcon(Utils.jobStates.getIcon(job.color, this.settings.green_balls_plugin))
		    });
		    
		    // use transient messages if persistent messages are disabled in settings
		    if( this.settings.stack_notifications==false )
		    	notification.setTransient(true);
		    
		    // notify the user
		    this.notification_source.notify(notification);
		}
		
		this.label.text = job.name;
		this.icon.icon_name = Utils.jobStates.getIcon(job.color, this.settings.green_balls_plugin);
	},
	
	// update settings
	updateSettings: function(settings) {
	    this.settings = settings;
	}
});

