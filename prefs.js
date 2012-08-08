const Lang = imports.lang;
const Gtk = imports.gi.Gtk;

const Gettext = imports.gettext.domain('jenkins-indicator');
const _ = Gettext.gettext;

let extension = imports.misc.extensionUtils.getCurrentExtension();
let convenience = extension.imports.convenience;

let settings;

const SETTINGS_SCHEMA = 'org.gnome.shell.extensions.jenkins-indicator';
const SETTINGS_JENKINS_URL_KEY = 'jenkins-url';

function init() {
    convenience.initLocalization(extension);
    settings = convenience.getSettings(extension, SETTINGS_SCHEMA);
}

// builds a line (label + switch) for a job filter setting
function buildFilterSetting(icon, label, setting_name)
{
	let hboxFilterJobs = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
	let iconFilterJobs = new Gtk.Image({file: extension.dir.get_path() + "/icons/prefs/" + icon + ".png"});
	let labelFilterJobs = new Gtk.Label({label: label, xalign: 0});
	let inputFilterJobs = new Gtk.Switch({active: settings.get_boolean(setting_name)});

	inputFilterJobs.connect("notify::active", Lang.bind(this, function(input){settings.set_boolean(setting_name, input.get_active()); }));

    hboxFilterJobs.pack_start(iconFilterJobs, false, false, 0);
    hboxFilterJobs.pack_start(labelFilterJobs, true, true, 0);
	hboxFilterJobs.add(inputFilterJobs);
	
	return hboxFilterJobs;
}

function buildPrefsWidget() {
    let frame = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, border_width: 10 });

    let vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
    
    // *** jenkins connection ***
    let labelJenkinsConnection = new Gtk.Label({ label: "<b>" + _("Jenkins connection") + "</b>", use_markup: true, xalign: 0 });
    vbox.add(labelJenkinsConnection);
    
    let vboxJenkinsConnection = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin_left: 20, margin_bottom: 15 });

		// jenkins url
	    let hboxJenkinsUrl = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
		let labelJenkinsUrl = new Gtk.Label({label: _("Jenkins CI Server web frontend URL"), xalign: 0});
		let inputJenkinsUrl = new Gtk.Entry({ hexpand: true, text: settings.get_string("jenkins-url") });
		
		inputJenkinsUrl.connect("changed", Lang.bind(this, function(input){	settings.set_string("jenkins-url", input.text); }));
	
	    hboxJenkinsUrl.pack_start(labelJenkinsUrl, true, true, 0);
		hboxJenkinsUrl.add(inputJenkinsUrl);
		vboxJenkinsConnection.add(hboxJenkinsUrl);
	
	vbox.add(vboxJenkinsConnection);
	
	
	// *** auto-refresh ***
	let labelPreferences = new Gtk.Label({ label: "<b>" + _("auto-refresh") + "</b>", use_markup: true, xalign: 0 });
	vbox.add(labelPreferences);
	
	let vboxAutoRefresh = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin_left: 20, margin_bottom: 15 });
	
		// auto refresh
		let hboxAutoRefresh = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
		let labelAutoRefresh = new Gtk.Label({label: _("auto-refresh"), xalign: 0});
		let inputAutoRefresh = new Gtk.Switch({active: settings.get_boolean("autorefresh")});
	
		inputAutoRefresh.connect("notify::active", Lang.bind(this, function(input){
			settings.set_boolean("autorefresh", input.get_active());
			inputAutorefreshInterval.set_editable(input.get_active());
		}));
	
	    hboxAutoRefresh.pack_start(labelAutoRefresh, true, true, 0);
		hboxAutoRefresh.add(inputAutoRefresh);
		vboxAutoRefresh.add(hboxAutoRefresh);
		
		// auto refresh interval
		let hboxAutorefreshInterval = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
		let labelAutorefreshInterval = new Gtk.Label({label: _("auto-refresh interval (seconds)"), xalign: 0});
		let inputAutorefreshInterval = new Gtk.SpinButton({ numeric: true, adjustment: new Gtk.Adjustment({value: settings.get_int("autorefresh-interval"), lower: 1, upper: 600, step_increment: 1}) });
		inputAutorefreshInterval.set_editable(inputAutoRefresh.get_active());
		
		inputAutorefreshInterval.connect("changed", Lang.bind(this, function(input){ settings.set_int("autorefresh-interval", input.get_value()); }));
	
	    hboxAutorefreshInterval.pack_start(labelAutorefreshInterval, true, true, 0);
		hboxAutorefreshInterval.add(inputAutorefreshInterval);
		vboxAutoRefresh.add(hboxAutorefreshInterval);
	
	vbox.add(vboxAutoRefresh);
	
	
	// *** notifications ***
	let labelNotifications = new Gtk.Label({ label: "<b>" + _("notifications") + "</b>", use_markup: true, xalign: 0 });
	vbox.add(labelNotifications);
	
	let vboxNotifications = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin_left: 20, margin_bottom: 15 });
	
		// notification for finished jobs
		let hboxNotificationFinishedJobs = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
		let labelNotificationFinishedJobs = new Gtk.Label({label: _("notification for finished jobs"), xalign: 0});
		let inputNotificationFinishedJobs = new Gtk.Switch({active: settings.get_boolean("notification-finished-jobs")});
	
		inputNotificationFinishedJobs.connect("notify::active", Lang.bind(this, function(input){
			settings.set_boolean("notification-finished-jobs", input.get_active());
		}));
	
	    hboxNotificationFinishedJobs.pack_start(labelNotificationFinishedJobs, true, true, 0);
		hboxNotificationFinishedJobs.add(inputNotificationFinishedJobs);
		vboxNotifications.add(hboxNotificationFinishedJobs);

	vbox.add(vboxNotifications);
	
	
	// *** job filters ***
	let labelPreferences = new Gtk.Label({ label: "<b>" + _("job filters") + "</b>", use_markup: true, xalign: 0 });
	vbox.add(labelPreferences);
	
	let vboxFilters = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin_left: 20, margin_bottom: 15 });
	
		// show running jobs
		vboxFilters.add(buildFilterSetting("clock", _('show running jobs'), 'show-running-jobs'));
		
		// show successful jobs
		vboxFilters.add(buildFilterSetting("blue", _('show successful jobs'), 'show-successful-jobs'));
		
		// show unstable jobs
		vboxFilters.add(buildFilterSetting("yellow", _('show unstable jobs'), 'show-unstable-jobs'));
		
		// show failed jobs
		vboxFilters.add(buildFilterSetting("red", _('show failed jobs'), 'show-failed-jobs'));
		
		// show disabled jobs
		vboxFilters.add(buildFilterSetting("grey", _('show disabled jobs'), 'show-disabled-jobs'));
		
		// show aborted jobs
		vboxFilters.add(buildFilterSetting("grey", _('show aborted jobs'), 'show-aborted-jobs'));
	
	vbox.add(vboxFilters);


	frame.add(vbox);    
    frame.show_all();
    
    return frame;
}
