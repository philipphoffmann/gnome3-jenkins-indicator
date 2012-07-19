const Lang = imports.lang;
const St = imports.gi.St;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Soup = imports.gi.Soup;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

let _indicator, _loop_active;

const _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());

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

const JenkinsIndicator = new Lang.Class({
    Name: 'JenkinsIndicator',
    Extends: PanelMenu.Button,

    _init: function() {
    	this.parent(0.25, 'Jenkins State', false );

        this._iconActor = new St.Icon({ icon_name: 'gnome-jenkins-icon',
                                        icon_type: St.IconType.SYMBOLIC,
                                        style_class: 'icon-clock' });
        this.actor.add_actor(this._iconActor);
        
        this.actor.connect('button-press-event', Lang.bind(this, this._onClick));
    },

	request: function() {
		// ajax request to jenkins server
		let request = Soup.Message.new('GET', 'http://localhost:8080/api/json');
		let this_indicator = this;
		_httpSession.queue_message(request, function(_httpSession, message) {
			let jenkinsJSON = request.response_body.data;
			let jenkinsState = JSON.parse(jenkinsJSON);
			this_indicator._update(jenkinsState);
		});
	},

	_update: function(state) {
		let newIconClass = 'icon-blue';
		let jobs = new Array();
		
		if( state==null || state.jobs==null || state.jobs.length<=0 )
			newIconClass = 'icon-red';
		else
		{
			// determine job states
			for( let i=0 ; i<state.jobs.length ; ++i )
			{
				if( state.jobs[i].color=='blue_anime' ) { newIconClass = 'icon-clock'; 	break; }
				if( state.jobs[i].color=='red' ) 		{ newIconClass = 'icon-red'; 	break; }
				if( state.jobs[i].color=='yellow' ) 	{ newIconClass = 'icon-yellow'; break; }
			}

			// fill popupmenu with job names
			this.menu.removeAll();
			for( let i=0 ; i<state.jobs.length ; ++i )
				this.menu.addMenuItem(new JobPopupMenuItem(this._mapColor2IconClass(state.jobs[i].color), state.jobs[i].name));
		}

		// set new icon representing current jenkins state
		this._iconActor.style_class = newIconClass;
		
		// add switch for observer mode
		this.menu.addMenuItem(new PopupSwitchMenuItem("observe", this._loop_active));
	},

	_onClick: function() {
		this._request();
	},
	
	_mapColor2IconClass: function(color) {
		if( color=='disabled' ) 	return 'icon-grey';
		if( color=='blue' ) 		return 'icon-blue';
		if( color=='yellow' ) 		return 'icon-yellow';
		if( color=='red' ) 			return 'icon-red';
		if( color=='blue_anime' ) 	return 'icon-clock';
		else						{ global.log('unkown color: ' + color); return 'icon-grey'; }
	}
});

function loop() {
	if( _loop_active )
	{
		global.log("loop");
		_indicator.request();
		Mainloop.timeout_add(3000, loop);
	}
}

function init() {

}

function enable() {
	_indicator = new JenkinsIndicator;
    Main.panel.addToStatusArea('gnome-jenkins', _indicator);
    
    // enter update loop
    _loop_active = true;
    loop();
}

function disable() {
	_loop_active = false;
    _indicator.destroy();
}
