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

function changedJenkinsUrl(input) {
	settings.set_string("jenkins-url", input.text);
}

function changedAutorefreshInterval(input) {
	settings.set_int("autorefresh-interval", input.text);
}

function changedFilterDisabledJobs(input) {
	settings.set_boolean("filter-disabled-jobs", input.get_active());
}

function buildPrefsWidget() {
    let frame = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL,
                              border_width: 10 });

    let vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL,
                             margin_left: 20 });
    
    labelJenkinsConnection = new Gtk.Label({ label: "<b>" + _("Jenkins connection") + "</b>", use_markup: true, xalign: 0 });

	// jenkins url
    let hboxJenkinsUrl = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
	let labelJenkinsUrl = new Gtk.Label({label: _("Jenkins CI Server web frontend URL"), xalign: 0});
	let inputJenkinsUrl = new Gtk.Entry({ hexpand: true, text: settings.get_string("jenkins-url") });
	
	inputJenkinsUrl.connect("changed", Lang.bind(this, changedJenkinsUrl));

    hboxJenkinsUrl.pack_start(labelJenkinsUrl, true, true, 0);
	hboxJenkinsUrl.add(inputJenkinsUrl);
	
	
	labelPreferences = new Gtk.Label({ label: "<b>" + _("preferences") + "</b>", use_markup: true, xalign: 0 });
	
	// auto refresh interval
	let hboxAutorefreshInterval = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
	let labelAutorefreshInterval = new Gtk.Label({label: _("auto-refresh interval (seconds)"), xalign: 0});
	let inputAutorefreshInterval = new Gtk.Entry({ hexpand: true, text: ""+settings.get_int("autorefresh-interval") });
	
	inputAutorefreshInterval.connect("changed", Lang.bind(this, changedAutorefreshInterval));

    hboxAutorefreshInterval.pack_start(labelAutorefreshInterval, true, true, 0);
	hboxAutorefreshInterval.add(inputAutorefreshInterval);
	
	// filter disables jobs
	let hboxFilterDisabledJobs = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
	let labelFilterDisabledJobs = new Gtk.Label({label: _("filter disabled jobs"), xalign: 0});
	let inputFilterDisabledJobs = new Gtk.Switch({active: settings.get_boolean("filter-disabled-jobs")});

	inputFilterDisabledJobs.connect("notify::active", Lang.bind(this, changedFilterDisabledJobs));

    hboxFilterDisabledJobs.pack_start(labelFilterDisabledJobs, true, true, 0);
	hboxFilterDisabledJobs.add(inputFilterDisabledJobs);
	
	
	vbox.add(labelJenkinsConnection)
	vbox.add(hboxJenkinsUrl);
	
	vbox.add(labelPreferences)
	vbox.add(hboxAutorefreshInterval);
	vbox.add(hboxFilterDisabledJobs);
	
	frame.add(vbox);
    
    frame.show_all();
    
    return frame;
}
