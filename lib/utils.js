/**
 * @author Philipp Hoffmann
 */

const St = imports.gi.St;

const ICON_SIZE_INDICATOR = 16;

function createStatusIcon(icon_name){
	let params = { icon_name : icon_name, icon_size : ICON_SIZE_INDICATOR, style_class : "system-status-icon"};
	if( St.IconType ){
		params.icon_type = St.IconType.FULLCOLOR;
	}
	return new St.Icon(params);
}


