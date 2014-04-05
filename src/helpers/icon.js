const St = imports.gi.St;

// few static settings
const ICON_SIZE_NOTIFICATION = 24;
const ICON_SIZE_INDICATOR = 16;

/*
 * Return status icon.
 */
function createStatusIcon(icon_name){
	let params = { icon_name : icon_name, icon_size : ICON_SIZE_INDICATOR, style_class : "system-status-icon"};

	// St.IconType got removed in Gnome 3.6. This is for backwards compatibility with Gnome 3.4.
	if( St.IconType ){
		params.icon_type = St.IconType.FULLCOLOR;
	}

	return new St.Icon(params);
}

/*
 * Return icon for notification.
 */
function createNotificationIcon(icon_name){
	let params = { icon_name : icon_name, icon_size : ICON_SIZE_NOTIFICATION};

	// St.IconType got removed in Gnome 3.6. This is for backwards compatibility with Gnome 3.4.
	if( St.IconType ){
		params.icon_type = St.IconType.FULLCOLOR;
	}

	return new St.Icon(params);
}