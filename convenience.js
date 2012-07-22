/**
 * @author Philipp Hoffmann
 */

const Gio = imports.gi.Gio;
const Gettext = imports.gettext;
const ExtensionUtils = imports.misc.extensionUtils;
const Config = imports.misc.config;

// get settings object
function getSettings(extension, schema) {
	extension = extension || ExtensionUtils.getCurrentExtension();
	
	schema = schema || 'org.gnome.shell.extensions.jenkins-indicator';
	
	const GioSSS = Gio.SettingsSchemaSource;
	
	// check if this extension was built with "make zip-file", and thus
	// has the schema files in a subfolder
	// otherwise assume that extension has been installed in the
	// same prefix as gnome-shell (and therefore schemas are available
	// in the standard folders)
	
	let schemaDir = extension.dir.get_child('schemas');
	let schemaSource;

	if (schemaDir.query_exists(null))
		schemaSource = GioSSS.new_from_directory(schemaDir.get_path(), GioSSS.get_default(), false);
	else
		schemaSource = GioSSS.get_default();
	
	let schemaObj = schemaSource.lookup(schema, true);

	if (!schemaObj)
		throw new Error('Schema ' + schema + ' could not be found for extension jenkins-indicator. Please check your installation.');

	return new Gio.Settings({ settings_schema: schemaObj });
}

// intialize localization
function initLocalization(extension, domain) {
	extension = extension || ExtensionUtils.getCurrentExtension();
	
	domain = domain || 'jenkins-indicator';
	
	// check if this extension was built with "make zip-file", and thus
	// has the locale files in a subfolder
	// otherwise assume that extension has been installed in the
	// same prefix as gnome-shell
	
	let localeDir = extension.dir.get_child('locale');
	
	if (localeDir.query_exists(null))
		Gettext.bindtextdomain(domain, localeDir.get_path());
	else
		Gettext.bindtextdomain(domain, Config.LOCALEDIR);
}