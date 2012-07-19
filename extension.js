const Lang = imports.lang;
const St = imports.gi.St;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Soup = imports.gi.Soup;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

// auto-refresh timeout in milliseconds
const TIMEOUT_AUTOREFRESH = 3000;

// url to jenkins json api
const JENKINS_URL = 'http://localhost:8080/';

let _indicator;

const _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());

// represent a job in the popup menu with icon and job name
const JobPopupMenuItem = new Lang.Class({
	Name: 'JobPopupMenuItem',
	Extends: PopupMenu.PopupBaseMenuItem,

    _init: function(icon_class, text, params)
    {
    	this.parent(params);

        this.box = new St.BoxLayout({ style_class: 'popup-combobox-item' });
        this.icon = new St.Icon({ icon_name: 'job-icon-'+text, icon_type: St.IconType.SYMBOLIC, style_class: icon_class });

        this.box.add(this.icon);
        this.label = new St.Label({ text: text });
        this.box.add(this.label);
        this.addActor(this.box);
	}
});

// manages jobs popup menu items
const JobPopupMenu = new Lang.Class({
	Name: 'JobPopupMenu',
	Extends: PopupMenu.PopupMenu,
	
	_init: function(sourceActor, arrowAlignment, arrowSide) {
		this.parent(sourceActor, arrowAlignment, arrowSide);
	}
});

// represents the indicator in the top menu bar
const JenkinsIndicator = new Lang.Class({
    Name: 'JenkinsIndicator',
    Extends: PanelMenu.Button,

    _init: function() {
    	this.parent(0.25, 'Jenkins State', false );
    	
    	this.autoRefresh = true;

		// start off with a blue icon
        this._iconActor = new St.Icon({ icon_name: 'gnome-jenkins-icon',
                                        icon_type: St.IconType.SYMBOLIC,
                                        style_class: this._mapColor2IconClass('blue') });
        this.actor.add_actor(this._iconActor);
        
        // add jobs popup menu
		this.setMenu(new JobPopupMenu(this.actor, 0.25, St.Side.TOP, 0));
        
        // refresh when indicator is clicked
        this.actor.connect('button-press-event', Lang.bind(this, this.request));
    },

	// request local jenkins server for current state
	request: function() {
		// ajax request to local jenkins server
		let request = Soup.Message.new('GET', JENKINS_URL + (JENKINS_URL.charAt(JENKINS_URL.length-1)!='/' ? '/' : '') + 'api/json');
		_httpSession.queue_message(request, function(_httpSession, message) {
			// parse json
			let jenkinsState = JSON.parse(request.response_body.data);
			
			// update indicator icon and popupmenu contents
			_indicator._update(jenkinsState);
		});
	},

	// update indicator icon and popupmenu contents
	_update: function(state) {
		// default css icon class of indicator
		let newIconClass = 'icon-blue';

		// set icon to red if provided state is not valid
		if( state==null || state.jobs==null || state.jobs.length<=0 )
			newIconClass = 'icon-red';
		else
		{
			// determine jobs overall state for the indicator
			for( let i=0 ; i<state.jobs.length ; ++i )
			{
				if( state.jobs[i].color=='blue_anime' ) { newIconClass = this._mapColor2IconClass(state.jobs[i].color); break; }
				if( state.jobs[i].color=='red' ) 		{ newIconClass = this._mapColor2IconClass(state.jobs[i].color); break; }
				if( state.jobs[i].color=='yellow' ) 	{ newIconClass = this._mapColor2IconClass(state.jobs[i].color); break; }
			}

			// fill popupmenu with job names
			this.menu.removeAll();
			for( let i=0 ; i<state.jobs.length ; ++i )
				this.menu.addMenuItem(new JobPopupMenuItem(this._mapColor2IconClass(state.jobs[i].color), state.jobs[i].name));
		}

		// set new indicator icon representing current jenkins state
		this._iconActor.style_class = newIconClass;
		
		// add switch for autorefresh mode
		this._switch_autorefresh = new PopupMenu.PopupSwitchMenuItem("auto-refresh", this.autoRefresh);
		this._switch_autorefresh.connect('toggled', function(){
			// toggle autoRefresh state
			_indicator.autoRefresh = !_indicator.autoRefresh;
			
			// try to restart refresh-loop
			loop();
		});
		this.menu.addMenuItem(this._switch_autorefresh);
	}, 
	
	// mapping of jenkins job states to css icon classes, feel free to add more here
	_mapColor2IconClass: function(color) {
		if( color=='disabled' ) 	return 'icon-grey';
		if( color=='blue' ) 		return 'icon-blue';
		if( color=='yellow' ) 		return 'icon-yellow';
		if( color=='red' ) 			return 'icon-red';
		if( color=='blue_anime' ) 	return 'icon-clock';
		else						{ global.log('unkown color: ' + color); return 'icon-grey'; }
	}
});

// main loop for auto-refreshing
function loop() {
	if( _indicator.autoRefresh )
	{
		// only refresh if menu is not open (otherwise the menu would disappear for a moment)
		if( !_indicator.menu.isOpen ) _indicator.request();
		
		// back to main loop after timeout
		Mainloop.timeout_add(TIMEOUT_AUTOREFRESH, loop);
	}
}

function init() {

}

function enable() {
	// create indicator and add to status area
	_indicator = new JenkinsIndicator;	
    Main.panel.addToStatusArea('gnome-jenkins', _indicator);
    
    // enter auto-refresh loop
    loop();
}

function disable() {
    _indicator.destroy();
}
