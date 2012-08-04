# gnome3-jenkins

## description:
Gnome 3 Shell Extension to represent the current state of all jobs of a Jenkins CI Server.
By default it monitors a local Jenkins instance by using its JSON API at http://localhost:8080/api/json.
This is the default URL when installing jenkins on Ubuntu 12.04 using apt-get.
See "configuration" for details on how to customize this for your needs.
Feel free to mail me any problems, suggestions or feedback to mail@philipphoffmann.de :-)

## requirements:
- Gnome 3.4.x
- Jenkins CI Server (with json api publicly available, see configuration)

## installation (automatically):
I will make the extension publicly available on extensions.gnome.org. Until then you have to stick to installing the extension manually. 

## installation (manually):
1. Copy all files to `~/.local/share/gnome-shell/extensions/gnome3-jenkins@philipphoffmann.de`

2. Assuming that you have the gnome shell running hit Alt+F2, type `r` or `restart` (without the ticks), hit enter. the shell should now restart.

If everything is set up correctly you should be able to click the extension icon to bring up a popup menu with all your Jenkins jobs. 

## configuration:
You can configure the extension using the regular extension settings dialog either by clicking **settings** in the extension popup menu or by running `gnome-shell-extension-prefs` and selection the **Jenkins CI Server Indicator** in the drop down menu. 

You can configure the following settings:

### 1. The Jenkins CI Server JSON API URL:
Set its value to your Jenkins web frontend URL.
You can check if the JSON API is available in your web browser by appending `/api/json` to your web frontend URL (which is what the extension does to get its information).

### 2. The auto-refresh interval:
You can change the auto-refresh interval that the extensions uses to track changes.
It is set to 3 seconds (3000 milliseconds) by default, meaning that every 3 seconds the extension requests the Jenkins CI Server for the current state of all jobs.
You can set this to whatever interval is fine for you.

### 3. Filter jobs:
There is a filter for each job state. Enabling the switch will show the matching jobs in the popup menu, disabling the switch will hide the jobs.
