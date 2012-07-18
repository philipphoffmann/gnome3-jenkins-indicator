const Lang = imports.lang;
const St = imports.gi.St;
const Main = imports.ui.main;
const Soup = imports.gi.Soup;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

let _indicator;

const _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());

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
        
        //this._loop_active
        
		this._request();
    },

	_request: function() {
		// ajax request to jenkins server
		let request = Soup.Message.new('GET', 'http://localhost:8080/api/json');
		let this_indicator = this;
		_httpSession.queue_message(request, function(_httpSession, message) {
			/*if (message.status_code !== 200) {
				callback(message.status_code, null);
				return;
			}*/
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
				this.menu.addMenuItem(new PopupMenu.PopupMenuItem(state.jobs[i].name));
		}

		// set new icon representing current jenkins state
		this._iconActor.style_class = newIconClass;
		
	},
	
	_loop: function() {
		
	},
	
	_onClick: function() {
		this._request();
	}
});

function init() {

}

function enable() {
	if( _indicator==null ) _indicator = new JenkinsIndicator;
    Main.panel.addToStatusArea('gnome-jenkins', _indicator);
}

function disable() {
    Main.panel._rightBox.remove_child(_indicator);
}
