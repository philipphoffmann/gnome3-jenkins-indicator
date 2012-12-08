/**
 * @author Philipp Hoffmann
 */

const Lang = imports.lang;
const St = imports.gi.St;
const Gtk = imports.gi.Gtk;
const PopupMenu = imports.ui.popupMenu;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const ServerPopupMenuItem = Me.imports.serverPopupMenuItem;
const Utils = Me.imports.utils;

/*
 * Server name and link in the popup menu.
 */
const PopupMenuScrollSection = new Lang.Class({
    Name: 'PopupMenuScrollSection',
    Extends: PopupMenu.PopupMenuSection,

    _init: function() {
        this.parent();
        
        this.scrollView = new St.ScrollView({ x_fill: true, y_fill: false, x_align: St.Align.START, y_align: St.Align.START, style_class: 'vfade applications-scrollbox' });
		this.scrollView.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
		this.box = new St.BoxLayout({ style_class: 'popup-combobox-item', vertical: true, style:'spacing: 0px' });

		this.scrollView.add_actor(this.box);

		this.actor = this.scrollView;
		this.actor._delegate = this;
    }
});

