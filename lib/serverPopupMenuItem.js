/**
 * @author Philipp Hoffmann
 */

const Lang = imports.lang;
const St = imports.gi.St;
const PopupMenu = imports.ui.popupMenu;
const Gio = imports.gi.Gio;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.lib.utils;

/*
 * Server name and link in the popup menu.
 */
const ServerPopupMenuItem = new Lang.Class({
    Name: 'ServerPopupMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem,

    _init: function(settings, params) {
        this.parent(params);
        
        this.settings = settings;
        
        this.box = new St.BoxLayout({ style_class: 'popup-combobox-item' });
        this.icon = Utils.createStatusIcon('jenkins_headshot');
        this.label = new St.Label({ text: this.settings.name });

        this.box.add(this.icon);
        this.box.add(this.label);
        this.addActor(this.box);
        
        // clicking the server menu item opens the servers web frontend with default browser
        this.event_showserver = this.connect("activate", Lang.bind(this, function(){
            Gio.app_info_launch_default_for_uri(this.settings.jenkins_url, global.create_app_launch_context());
        }));
    },

    // update menu item label (server name)
    updateSettings: function(settings) {
        this.settings = settings;
        this.label.text = this.settings.name;
    },
    
    // destroys the server popup menu item
    destroy: function() {
		// destroy events
		this.disconnect(this.event_showserver);

		// destroy children
        this.icon.destroy();
        this.label.destroy();
        this.box.destroy();
        
        this.parent();
    }
});
