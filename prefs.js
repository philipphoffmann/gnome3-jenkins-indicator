/*
 * @author Philipp Hoffmann
 */

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

// update json settings for server in settings schema
function updateServerSetting(server_num, setting, value)
{
    settingsJSON = Settings.getSettingsJSON(settings);
    settingsJSON["servers"][server_num][setting] = value;
    settings.set_string("settings-json", JSON.stringify(settingsJSON));
}

// create a new server tab and add it to the notebook
function addTabPanel(notebook, server_num)
{
    // use server name as tab label
    let tabLabel = new Gtk.Label({ label: settingsJSON['servers'][server_num]['name']});
    
    let vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, border_width: 10 });

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
        
        // use authentication
        let hboxUseAuthentication = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
        let labelUseAuthentication = new Gtk.Label({label: _("Use authentication"), xalign: 0});
        global.log(JSON.stringify(settingsJSON['servers'][server_num]));
        let inputUseAuthentication = new Gtk.Switch({active: settingsJSON['servers'][server_num]['use_authentication']});

        inputUseAuthentication.connect("notify::active", Lang.bind(this, function(input){
            updateServerSetting(server_num, 'use_authentication', input.get_active());
            inputApiToken.set_editable(input.get_active());
            inputAuthUser.set_editable(input.get_active());
        }));
        
        hboxUseAuthentication.pack_start(labelUseAuthentication, true, true, 0);
        hboxUseAuthentication.add(inputUseAuthentication);
        vboxJenkinsConnection.add(hboxUseAuthentication);
        
        // user to authenticate
        let hboxAuthUser = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
        let labelAuthUser = new Gtk.Label({label: _("Authentication user"), xalign: 0});
        let inputAuthUser = new Gtk.Entry({ editable: inputUseAuthentication.get_active(), hexpand: true, text: settingsJSON['servers'][server_num]['auth_user'] });

        inputAuthUser.connect("changed", Lang.bind(this, function(input){ updateServerSetting(server_num, "auth_user", input.text); }));

        hboxAuthUser.pack_start(labelAuthUser, true, true, 0);
        hboxAuthUser.add(inputAuthUser);
        vboxJenkinsConnection.add(hboxAuthUser);
        
        // api token
        let hboxApiToken = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
        let labelApiToken = new Gtk.Label({label: _("Authentication API token"), xalign: 0});
        let inputApiToken = new Gtk.Entry({ editable: inputUseAuthentication.get_active(), hexpand: true, text: settingsJSON['servers'][server_num]['api_token'] });

        inputApiToken.connect("changed", Lang.bind(this, function(input){ updateServerSetting(server_num, "api_token", input.text); }));

        hboxApiToken.pack_start(labelApiToken, true, true, 0);
        hboxApiToken.add(inputApiToken);
        vboxJenkinsConnection.add(hboxApiToken);
        
        // green balls plugin
        vboxJenkinsConnection.add(buildIconSwitchSetting("green", _("'Green Balls' plugin"), 'green_balls_plugin', server_num));

    vbox.add(vboxJenkinsConnection);


    // *** auto-refresh ***
    let labelPreferences = new Gtk.Label({ label: "<b>" + _("Auto-refresh") + "</b>", use_markup: true, xalign: 0 });
    vbox.add(labelPreferences);

    let vboxAutoRefresh = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin_left: 20, margin_bottom: 15 });

        // auto refresh
        let hboxAutoRefresh = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
        let labelAutoRefresh = new Gtk.Label({label: _("Auto-refresh"), xalign: 0});
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
        let labelAutorefreshInterval = new Gtk.Label({label: _("Auto-refresh interval (seconds)"), xalign: 0});
        
        // had to replace the spinbutton since the change event is not triggered if the value is change by key presses
        //let inputAutorefreshInterval = new Gtk.SpinButton({ numeric: true, adjustment: new Gtk.Adjustment({value: settings.get_int("autorefresh-interval"), lower: 1, upper: 86400, step_increment: 1}) });
        let inputAutorefreshInterval = new Gtk.Scale({orientation: Gtk.Orientation.HORIZONTAL, adjustment: new Gtk.Adjustment({lower: 1, upper: 600, step_increment: 1})});
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
    let labelNotifications = new Gtk.Label({ label: "<b>" + _("Notifications") + "</b>", use_markup: true, xalign: 0 });
    vbox.add(labelNotifications);

    let vboxNotifications = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin_left: 20, margin_bottom: 15 });

        // notification for finished jobs
        let hboxNotificationFinishedJobs = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
        let labelNotificationFinishedJobs = new Gtk.Label({label: _("Notification for finished jobs"), xalign: 0});
        let inputNotificationFinishedJobs = new Gtk.Switch({active: settingsJSON['servers'][server_num]['notification_finished_jobs']});

        inputNotificationFinishedJobs.connect("notify::active", Lang.bind(this, function(input){
            updateServerSetting(server_num, 'notification_finished_jobs', input.get_active());
        }));

        hboxNotificationFinishedJobs.pack_start(labelNotificationFinishedJobs, true, true, 0);
        hboxNotificationFinishedJobs.add(inputNotificationFinishedJobs);
        vboxNotifications.add(hboxNotificationFinishedJobs);
        
        // stack notifications
        let hboxStackNotifications = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
        let labelStackNotifications = new Gtk.Label({label: _("Stack notifications in message tray"), xalign: 0});
        let inputStackNotifications = new Gtk.Switch({active: settingsJSON['servers'][server_num]['stack_notifications']});
    
        inputStackNotifications.connect("notify::active", Lang.bind(this, function(input){
            updateServerSetting(server_num, 'stack_notifications', input.get_active());
        }));
    
        hboxStackNotifications.pack_start(labelStackNotifications, true, true, 0);
        hboxStackNotifications.add(inputStackNotifications);
        vboxNotifications.add(hboxStackNotifications);

    vbox.add(vboxNotifications);


    // *** job filters ***
    let labelFilters = new Gtk.Label({ label: "<b>" + _("Job filters") + "</b>", use_markup: true, xalign: 0 });
    vbox.add(labelFilters);

    let vboxFilters = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin_left: 20, margin_bottom: 15 });

        // show running jobs
        vboxFilters.add(buildIconSwitchSetting("clock", _('Show running jobs'), 'show_running_jobs', server_num));

        // show successful jobs
        vboxFilters.add(buildIconSwitchSetting("blue", _('Show successful jobs'), 'show_successful_jobs', server_num));

        // show unstable jobs
        vboxFilters.add(buildIconSwitchSetting("yellow", _('Show unstable jobs'), 'show_unstable_jobs', server_num));

        // show failed jobs
        vboxFilters.add(buildIconSwitchSetting("red", _('Show failed jobs'), 'show_failed_jobs', server_num));

        // show disabled jobs
        vboxFilters.add(buildIconSwitchSetting("grey", _('Show never built jobs'), 'show_neverbuilt_jobs', server_num));

        // show disabled jobs
        vboxFilters.add(buildIconSwitchSetting("grey", _('Show disabled jobs'), 'show_disabled_jobs', server_num));

        // show aborted jobs
        vboxFilters.add(buildIconSwitchSetting("grey", _('Show aborted jobs'), 'show_aborted_jobs', server_num));
	
	 // Jobs to show
	let hboxJobsToShow = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
	let labelJobsToShow = new Gtk.Label({label: _("Jobs to show"), xalign: 0});
	let inputJobsToShow = new Gtk.Entry({ editable: true, hexpand: true, text: settingsJSON['servers'][server_num]['jobs_to_show'] });

	inputJobsToShow.connect("changed", Lang.bind(this, function(input){ updateServerSetting(server_num, "jobs_to_show", input.text); }));

        hboxJobsToShow.pack_start(labelJobsToShow, true, true, 0);
        hboxJobsToShow.add(inputJobsToShow);
	vboxFilters.add(hboxJobsToShow);

    vbox.add(vboxFilters);
    
    // button to remove tab
    let iconRemoveServer = new Gtk.Image({file: Me.dir.get_path() + "/icons/prefs/stop.png"});
    let btnRemoveServer = new Gtk.Button({image: iconRemoveServer});
        
    btnRemoveServer.connect('clicked', Lang.bind(notebook, function(){
        if( notebook.get_n_pages()>1 )
        {
            // remove server from settings
            settingsJSON['servers'].splice(notebook.page_num(tabContent), 1);
            settings.set_string("settings-json", JSON.stringify(settingsJSON));
            
            // remove tab from notebook
            notebook.remove_page(notebook.page_num(tabContent));
        }
    }));

    // widget for tab containing label and close button
    let tabWidget = new Gtk.HBox({ spacing: 5 });
    tabWidget.add(tabLabel);
    tabWidget.add(btnRemoveServer);
    tabWidget.show_all();
    
    // tab content
    let tabContent = new Gtk.ScrolledWindow({ vexpand: true });
    tabContent.add_with_viewport(vbox);
    
    // append tab to notebook
    notebook.append_page(tabContent, tabWidget);
}

function buildPrefsWidget() {
	// *** tab panel ***
	let notebook = new Gtk.Notebook();
	
	for( let i=0 ; i<settingsJSON['servers'].length ; ++i )
	{
	    // add tab panels for each server
	    addTabPanel(notebook, i);
    }
	    
	
	// button to add new servers
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
    
    // add new server button
    frame.add(btnNewServer);
    
    // add notebook
	frame.add(notebook);
	
	// show the frame
    frame.show_all();

    return frame;
}
