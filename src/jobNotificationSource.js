/**
 * @author Philipp Hoffmann
 */

const Lang = imports.lang;
const St = imports.gi.St;
const MessageTray = imports.ui.messageTray;
const SessionMessageTray = imports.ui.main.messageTray;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.src.helpers.utils;
const Icon = Me.imports.src.helpers.icon;

/*
 * Source for handling job notifications.
 */
const JobNotificationSource = new Lang.Class({
	Name: 'JobNotificationSource',
	Extends: MessageTray.Source,

	_init: function(title) {
		// set notification source title

		this.parent(title, 'jenkins_headshot');

		// set notification source icon
		this._setSummaryIcon(this.createNotificationIcon());
		
		// add myself to the message try
		SessionMessageTray.add(this);
	},

	// set jenkins logo for notification source icon
	createNotificationIcon: function() {
		return Icon.createNotificationIcon('jenkins_headshot');
	},

	// gets called when a notification is clicked
	open: function(notification) {
		// close the clicked notification
		notification.destroy();
	}
});


