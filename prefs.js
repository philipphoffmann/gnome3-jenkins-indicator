const Lang = imports.lang;
const Gtk = imports.gi.Gtk;

const Gettext = imports.gettext.domain('jenkins-indicator');
const _ = Gettext.gettext;
const N_ = function(e) { return e; };

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
function buildFilterSetting(label, setting_name)
{
	let hboxFilterAbortedJobs = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
	let labelFilterAbortedJobs = new Gtk.Label({label: label, xalign: 0});
	let inputFilterAbortedJobs = new Gtk.Switch({active: settings.get_boolean(setting_name)});

	inputFilterAbortedJobs.connect("notify::active", Lang.bind(this, function(input){settings.set_boolean(setting_name, input.get_active()); }));

    hboxFilterAbortedJobs.pack_start(labelFilterAbortedJobs, true, true, 0);
	hboxFilterAbortedJobs.add(inputFilterAbortedJobs);
	
	return hboxFilterAbortedJobs;
}

function buildPrefsWidget() {
    let frame = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL,
                              border_width: 10 });

    let vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL,
                             margin_left: 20 });
    
    // *** jenkins connection ***
    let labelJenkinsConnection = new Gtk.Label({ label: "<b>" + _("Jenkins connection") + "</b>", use_markup: true, xalign: 0 });
    vbox.add(labelJenkinsConnection);

	// jenkins url
    let hboxJenkinsUrl = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
	let labelJenkinsUrl = new Gtk.Label({label: _("Jenkins CI Server web frontend URL"), xalign: 0});
	let inputJenkinsUrl = new Gtk.Entry({ hexpand: true, text: settings.get_string("jenkins-url") });
	
	inputJenkinsUrl.connect("changed", Lang.bind(this, function(input){	settings.set_string("jenkins-url", input.text); }));

    hboxJenkinsUrl.pack_start(labelJenkinsUrl, true, true, 0);
	hboxJenkinsUrl.add(inputJenkinsUrl);
	vbox.add(hboxJenkinsUrl);
	
	
	// *** auto-refresh ***
	let labelPreferences = new Gtk.Label({ label: "<b>" + _("auto-refresh") + "</b>", use_markup: true, xalign: 0 });
	vbox.add(labelPreferences);
	
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
	vbox.add(hboxAutoRefresh);
	
	// auto refresh interval
	let hboxAutorefreshInterval = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
	let labelAutorefreshInterval = new Gtk.Label({label: _("auto-refresh interval (seconds)"), xalign: 0});
	let inputAutorefreshInterval = new Gtk.SpinButton({ numeric: true, adjustment: new Gtk.Adjustment({value: settings.get_int("autorefresh-interval"), lower: 1, upper: 600, step_increment: 1}) });
	
	inputAutorefreshInterval.connect("changed", Lang.bind(this, function(input){ settings.set_int("autorefresh-interval", input.get_value()); }));

    hboxAutorefreshInterval.pack_start(labelAutorefreshInterval, true, true, 0);
	hboxAutorefreshInterval.add(inputAutorefreshInterval);
	vbox.add(hboxAutorefreshInterval);
	
	
	// *** job filters ***
	let labelPreferences = new Gtk.Label({ label: "<b>" + _("job filters") + "</b>", use_markup: true, xalign: 0 });
	vbox.add(labelPreferences);
	
	// show running jobs
	vbox.add(buildFilterSetting(_('show running jobs'), 'show-running-jobs'));
	
	// show successful jobs
	vbox.add(buildFilterSetting(_('show successful jobs'), 'show-successful-jobs'));
	
	// show unstable jobs
	vbox.add(buildFilterSetting(_('show unstable jobs'), 'show-unstable-jobs'));
	
	// show failed jobs
	vbox.add(buildFilterSetting(_('show failed jobs'), 'show-failed-jobs'));
	
	// show disabled jobs
	vbox.add(buildFilterSetting(_('show disabled jobs'), 'show-disabled-jobs'));
	
	// show aborted jobs
	vbox.add(buildFilterSetting(_('show aborted jobs'), 'show-aborted-jobs'));


	frame.add(vbox);    
    frame.show_all();
    
    return frame;
}
