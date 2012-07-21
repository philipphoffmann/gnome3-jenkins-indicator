/**
 * @author Philipp Hoffmann
 */

const Gettext = imports.gettext;
const ExtensionUtils = imports.misc.extensionUtils;
const Config = imports.misc.config;

// intialize localization
function initLocalization(domain) {
	let this_extension = ExtensionUtils.getCurrentExtension();
	
	domain = domain || 'gnome3-jenkins';
	
	// check if this extension was built with "make zip-file", and thus
	// has the locale files in a subfolder
	// otherwise assume that extension has been installed in the
	// same prefix as gnome-shell
	
	let localeDir = this_extension.dir.get_child('locale');
	
	if (localeDir.query_exists(null))
		Gettext.bindtextdomain(domain, localeDir.get_path());
	else
		Gettext.bindtextdomain(domain, Config.LOCALEDIR);
}
