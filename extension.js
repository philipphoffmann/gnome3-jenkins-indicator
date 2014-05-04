/**
 * @author Philipp Hoffmann
 */

const Lang = imports.lang;
const St = imports.gi.St;
const Main = imports.ui.main;
const Gio = imports.gi.Gio;
const Soup = imports.gi.Soup;
const PopupMenu = imports.ui.popupMenu;

// import convenience module (for localization)
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.lib.convenience;
const Settings = Me.imports.src.settings;
const Utils = Me.imports.src.helpers.utils;
const JenkinsIndicator = Me.imports.src.jenkinsIndicator;

let _indicators = [];
let settings, settingsJSON;

// signals container (for clean disconnecting from signals if extension gets disabled)
let event_signals = [];

const _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());

function createIndicator(server_num) {
	// create indicator and add to status area
	_indicators[server_num] = new JenkinsIndicator.JenkinsIndicator(settingsJSON['servers'][server_num], _httpSession);
	Main.panel.addToStatusArea("jenkins-indicator-"+settingsJSON['servers'][server_num]['id'], _indicators[server_num]);
}

function init(extensionMeta) {
	// add include path for icons
	let theme = imports.gi.Gtk.IconTheme.get_default();
	theme.append_search_path(extensionMeta.path + "/icons");

	// load localization dictionaries
	Convenience.initTranslations();

	// load extension settings
	settings = Convenience.getSettings();
	settingsJSON = Settings.getSettingsJSON(settings);
}

function enable() {
	// we need to add indicators in reverse order so they appear from left to right
	for( let i=settingsJSON['servers'].length-1 ; i>=0 ; --i )
		createIndicator(i);
	
	// react to changing settings by adding/removing indicators if necessary
	event_signals.push( settings.connect('changed::settings-json', function(){
		let settingsJSON_old = settingsJSON;
		settingsJSON = Settings.getSettingsJSON(settings);

		// destroy deleted indicators
		Utils.arrayOpCompare(settingsJSON_old['servers'], settingsJSON['servers'], function(a, b){
			return a['id']==b['id'];
		}, function(index, element){
			_indicators[index].destroy();
			_indicators.splice(index,1);
		});
		
		// create new indicators
		Utils.arrayOpCompare(settingsJSON['servers'], settingsJSON_old['servers'], function(a, b){
			return a['id']==b['id'];
		}, function(index, element){
			createIndicator(index);
		});
		
		// update all indicators
		for( let i=0 ; i<_indicators.length ; ++i )	{
			_indicators[i].updateSettings(settingsJSON['servers'][i]);
			_indicators[i].request();
		}
	}) );
}

function disable() {
	for( var i=0 ; i<_indicators.length ; ++i ) {
		_indicators[i].destroy();
	}

	_indicators = [];
	
	// disconnect all signal listeners
	for( var i=0 ; i<event_signals.length ; ++i ) {
		settings.disconnect(event_signals[i]);
	}
}
