const Lang = imports.lang;
const Gtk = imports.gi.Gtk;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Settings = Me.imports.settings;

const _ = imports.gettext.domain(Me.metadata['gettext-domain']).gettext;

let settings, settingsJSON;

function init() {
    Convenience.initTranslations();
    settings = Convenience.getSettings();
    settingsJSON = Settings.getSettingsJSON(settings);
}

// builds a line (icon + label + switch) for a setting
function buildIconSwitchSetting(icon, label, setting_name, server_num)
{
	let hboxFilterJobs = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
	let iconFilterJobs = new Gtk.Image({file: Me.dir.get_path() + "/icons/prefs/" + icon + ".png"});
	let labelFilterJobs = new Gtk.Label({label: label, xalign: 0});
	let inputFilterJobs = new Gtk.Switch({active: settingsJSON['servers'][server_num][setting_name]});

	inputFilterJobs.connect("notify::active", Lang.bind(this, function(input){ updateServerSetting(server_num, setting_name, input.get_active()); }));

    hboxFilterJobs.pack_start(iconFilterJobs, false, false, 0);
    hboxFilterJobs.pack_start(labelFilterJobs, true, true, 0);
	hboxFilterJobs.add(inputFilterJobs);

	return hboxFilterJobs;
}

function updateSetting(setting, value)
{
    settingsJSON = Settings.getSettingsJSON(settings);
    settingsJSON[setting] = value;
    settings.set_string("settings-json", JSON.stringify(settingsJSON));
}

function updateServerSetting(server_num, setting, value)
{
    settingsJSON = Settings.getSettingsJSON(settings);
    settingsJSON["servers"][server_num][setting] = value;
    settings.set_string("settings-json", JSON.stringify(settingsJSON));
}

function addTabPanel(notebook, server_num)
{
    let tabLabel = new Gtk.Label({ label: settingsJSON['servers'][server_num]['name']});
    
    let vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });

    // *** jenkins connection ***
    let labelJenkinsConnection = new Gtk.Label({ label: "<b>" + _("Jenkins connection") + "</b>", use_markup: true, xalign: 0 });
    vbox.add(labelJenkinsConnection);

    let vboxJenkinsConnection = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin_left: 20, margin_bottom: 15 });
    
        // server name
        let hboxServerName = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
        let labelServerName = new Gtk.Label({label: _("Jenkins CI Server name"), xalign: 0});
        let inputServerName = new Gtk.Entry({ hexpand: true, text: settingsJSON['servers'][server_num]['name'] });

        inputServerName.connect("changed", Lang.bind(this, function(input){ tabLabel.set_text(input.text); updateServerSetting(server_num, "name", input.text); }));

        hboxServerName.pack_start(labelServerName, true, true, 0);
        hboxServerName.add(inputServerName);
        vboxJenkinsConnection.add(hboxServerName);

        // jenkins url
        let hboxJenkinsUrl = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
        let labelJenkinsUrl = new Gtk.Label({label: _("Jenkins CI Server web frontend URL"), xalign: 0});
        let inputJenkinsUrl = new Gtk.Entry({ hexpand: true, text: settingsJSON['servers'][server_num]['jenkins_url'] });

        inputJenkinsUrl.connect("changed", Lang.bind(this, function(input){ updateServerSetting(server_num, "jenkins_url", input.text); }));

        hboxJenkinsUrl.pack_start(labelJenkinsUrl, true, true, 0);
        hboxJenkinsUrl.add(inputJenkinsUrl);
        vboxJenkinsConnection.add(hboxJenkinsUrl);
        
        // green balls plugin
        vboxJenkinsConnection.add(buildIconSwitchSetting("green", _("'Green Balls' plugin"), 'green_balls_plugin', server_num));
        /*let hboxGreenBallsPlugin = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
        let iconGreenBallsPlugin = new Gtk.Image({file: Me.dir.get_path() + "/icons/prefs/green.png"});
        let labelGreenBallsPlugin = new Gtk.Label({label: _("'Green Balls' plugin"), xalign: 0});
        let inputGreenBallsPlugin = new Gtk.Switch({active: settingsJSON['green_balls_plugin']});
    
        inputGreenBallsPlugin.connect("notify::active", Lang.bind(this, function(input){ updateSetting('green_balls_plugin', input.get_active()); }));
    
        hboxGreenBallsPlugin.pack_start(iconGreenBallsPlugin, false, false, 0);
        hboxGreenBallsPlugin.pack_start(labelGreenBallsPlugin, true, true, 0);
        hboxGreenBallsPlugin.add(inputGreenBallsPlugin);
        
        vboxJenkinsConnection.add(hboxGreenBallsPlugin);*/

    vbox.add(vboxJenkinsConnection);


    // *** auto-refresh ***
    let labelPreferences = new Gtk.Label({ label: "<b>" + _("auto-refresh") + "</b>", use_markup: true, xalign: 0 });
    vbox.add(labelPreferences);

    let vboxAutoRefresh = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin_left: 20, margin_bottom: 15 });

        // auto refresh
        let hboxAutoRefresh = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
        let labelAutoRefresh = new Gtk.Label({label: _("auto-refresh"), xalign: 0});
        let inputAutoRefresh = new Gtk.Switch({active: settingsJSON['servers'][server_num]['autorefresh']});

        inputAutoRefresh.connect("notify::active", Lang.bind(this, function(input){
            updateServerSetting(server_num, 'autorefresh', input.get_active());
            //inputAutorefreshInterval.set_editable(input.get_active());
        }));

        hboxAutoRefresh.pack_start(labelAutoRefresh, true, true, 0);
        hboxAutoRefresh.add(inputAutoRefresh);
        vboxAutoRefresh.add(hboxAutoRefresh);

        // auto refresh interval
        let hboxAutorefreshInterval = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
        let labelAutorefreshInterval = new Gtk.Label({label: _("auto-refresh interval (seconds)"), xalign: 0});
        
        // had to replace the spinbutton since the change event is not triggered if the value is change by key presses
        //let inputAutorefreshInterval = new Gtk.SpinButton({ numeric: true, adjustment: new Gtk.Adjustment({value: settings.get_int("autorefresh-interval"), lower: 1, upper: 86400, step_increment: 1}) });
        let inputAutorefreshInterval = new Gtk.HScale.new_with_range( 1, 600, 1 );
        inputAutorefreshInterval.set_value(settingsJSON['servers'][server_num]['autorefresh_interval']);
        inputAutorefreshInterval.set_size_request(200, -1);
        
        // this doesnt work for a slider
        //inputAutorefreshInterval.set_editable(inputAutoRefresh.get_active());

        inputAutorefreshInterval.connect("value_changed", Lang.bind(inputAutorefreshInterval, function(){ updateServerSetting(server_num, 'autorefresh_interval', this.get_value()); }));

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
        let inputNotificationFinishedJobs = new Gtk.Switch({active: settingsJSON['servers'][server_num]['notification_finished_jobs']});

        inputNotificationFinishedJobs.connect("notify::active", Lang.bind(this, function(input){
            updateServerSetting(server_num, 'notification_finished_jobs', input.get_active());
        }));

        hboxNotificationFinishedJobs.pack_start(labelNotificationFinishedJobs, true, true, 0);
        hboxNotificationFinishedJobs.add(inputNotificationFinishedJobs);
        vboxNotifications.add(hboxNotificationFinishedJobs);
        
        // stack notifications
        let hboxStackNotifications = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
        let labelStackNotifications = new Gtk.Label({label: _("stack notifications in message tray"), xalign: 0});
        let inputStackNotifications = new Gtk.Switch({active: settingsJSON['servers'][server_num]['stack_notifications']});
    
        inputStackNotifications.connect("notify::active", Lang.bind(this, function(input){
            updateServerSetting(server_num, 'stack_notifications', input.get_active());
        }));
    
        hboxStackNotifications.pack_start(labelStackNotifications, true, true, 0);
        hboxStackNotifications.add(inputStackNotifications);
        vboxNotifications.add(hboxStackNotifications);

    vbox.add(vboxNotifications);


    // *** job filters ***
    let labelFilters = new Gtk.Label({ label: "<b>" + _("job filters") + "</b>", use_markup: true, xalign: 0 });
    vbox.add(labelFilters);

    let vboxFilters = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin_left: 20, margin_bottom: 15 });

        // show running jobs
        vboxFilters.add(buildIconSwitchSetting("clock", _('show running jobs'), 'show_running_jobs', server_num));

        // show successful jobs
        vboxFilters.add(buildIconSwitchSetting("blue", _('show successful jobs'), 'show_successful_jobs', server_num));

        // show unstable jobs
        vboxFilters.add(buildIconSwitchSetting("yellow", _('show unstable jobs'), 'show_unstable_jobs', server_num));

        // show failed jobs
        vboxFilters.add(buildIconSwitchSetting("red", _('show failed jobs'), 'show_failed_jobs', server_num));

        // show disabled jobs
        vboxFilters.add(buildIconSwitchSetting("grey", _('show never built jobs'), 'show_neverbuilt_jobs', server_num));

        // show disabled jobs
        vboxFilters.add(buildIconSwitchSetting("grey", _('show disabled jobs'), 'show_disabled_jobs', server_num));

        // show aborted jobs
        vboxFilters.add(buildIconSwitchSetting("grey", _('show aborted jobs'), 'show_aborted_jobs', server_num));
    vbox.add(vboxFilters);
    
    let btnRemoveServer = new Gtk.Button({label: ' x '});
        
    btnRemoveServer.connect('clicked', Lang.bind(notebook, function(){
        if( notebook.get_n_pages()>1 )
        {
            removeTab(notebook.page_num(tabContent));
            notebook.remove_page(notebook.page_num(tabContent));
            global.log(JSON.stringify(settingsJSON));
        }
    }));

    let tabWidget = new Gtk.HBox({ spacing: 5 });
    tabWidget.add(tabLabel);
    tabWidget.add(btnRemoveServer);
    tabWidget.show_all();
    
    let tabContent = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, border_width: 10 });
    tabContent.add(vbox);
    
    notebook.append_page(tabContent, tabWidget);
}

function removeTab(server_num) {
    settingsJSON['servers'].splice(server_num, 1);
    
    settings.set_string("settings-json", JSON.stringify(settingsJSON));
}

function buildPrefsWidget() {
	// *** tab panel ***
	let notebook = new Gtk.Notebook();
	
	for( let i=0 ; i<settingsJSON['servers'].length ; ++i )
	{
	    addTabPanel(notebook, i);
    }
	    
	
	// *** add server panel ***
	let btnNewServer = new Gtk.Button({label: _('Add server')});
	btnNewServer.connect('clicked', Lang.bind(notebook, function(){
        // get default settings for this new server
        settingsJSON['servers'][settingsJSON['servers'].length] = Settings.DefaultSettings['servers'][0];
        
        // set new id
        let currentDate = new Date;
        settingsJSON['servers'][settingsJSON['servers'].length-1]['id'] = currentDate.getTime();
        
        // save new settings
        settings.set_string("settings-json", JSON.stringify(settingsJSON));
    
        // add tab with copied settings
        addTabPanel(notebook, settingsJSON['servers'].length-1);
        notebook.show_all();
        
        // jump to added tab
        notebook.set_current_page(settingsJSON['servers'].length-1);
    }));

    // *** overall frame ***
    let frame = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, border_width: 10 });
    frame.add(btnNewServer);
	frame.add(notebook);
    frame.show_all();

    return frame;
}
