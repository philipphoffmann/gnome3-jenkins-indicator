/**
 * @author Philipp Hoffmann
 */

const Lang = imports.lang;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const PopupMenu = imports.ui.popupMenu;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;

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

        // For Gnome 3.8 and below
        if( typeof this.addActor != 'undefined' ) {
			this.addActor(this.box);
		}
		// For Gnome 3.10 and above
		else {
			this.actor.add_child(this.box);
		}
        
        // clicking the server menu item opens the servers web frontend with default browser
        this.connect("activate", Lang.bind(this, function(){
            Gio.app_info_launch_default_for_uri(this.settings.jenkins_url, global.create_app_launch_context());
        }));
    },

    // update menu item label (server name)
    updateSettings: function(settings) {
        this.settings = settings;
        this.label.text = this.settings.name;
    }
});
