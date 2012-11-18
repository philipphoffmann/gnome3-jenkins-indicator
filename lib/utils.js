/**
 * @author Philipp Hoffmann
 */

const St = imports.gi.St;

const ICON_SIZE_INDICATOR = 16;

// append a uri to a domain regardless whether domains ends with '/' or not
function urlAppend(domain, uri)
{
	if( domain.length>=1 )
		return domain + (domain.charAt(domain.length-1)!='/' ? '/' : '') + uri;
	else
		return uri;
}

// call operation on all elements of array2 which are not in array1 using a compare function
function arrayOpCompare(array1, array2, compare_func, operation_func)
{
    for( var i=0 ; i<array1.length ; ++i )
    {
        found_in_array2 = false;
        for( var j=0 ; j<array2.length ; ++j )
        {
            if( compare_func(array1[i], array2[j]) )
                found_in_array2 = true;
        }
        
        if( !found_in_array2 )
            operation_func(i, array1[i]);
    }
}
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
