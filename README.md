# gnome3-jenkins-indicator

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
Jenkins Indicator is publicly available on [extensions.gnome.org](https://extensions.gnome.org/extension/399/jenkins-ci-server-indicator/).
You can conveniently install it like any other Gnome 3 extension in the library.

## installation (manually):
1. Copy all files to `~/.local/share/gnome-shell/extensions/jenkins-indicator@philipphoffmann.de`

2. Assuming that you have the gnome shell running hit Alt+F2, type `r` or `restart` (without the ticks), hit enter. The shell should now restart.

If everything is set up correctly you should be able to click the extension icon to bring up a popup menu with all your Jenkins jobs. 

## configuration:
You can configure the extension using the regular extension settings dialog either by clicking **settings** in the extension popup menu or by running `gnome-shell-extension-prefs` and selection the **Jenkins CI Server Indicator** in the drop down menu. 

You can configure the following settings:

### 1. The Jenkins CI Server JSON API URL:
Set its value to your Jenkins web frontend URL.
You can check if the JSON API is available in your web browser by appending `/api/json` to your web frontend URL (which is what the extension does to get its information).
You can also enable the "Green Balls Plugin" in this section which enables using green ball icons instead of blue ones, just like the green balls plugin in Jenkins (Thanks to [negesti](https://github.com/negesti) for this contribution).

### 2. Auto-refreshing:
By default the extension automatically requests the Jenkins CI Server for the state of all jobs at a given interval.
You can turn this feature off or on.
You can also change the auto-refresh interval that the extensions uses to track changes.
It is set to 3 seconds by default, meaning that every 3 seconds the extension requests the Jenkins CI Server for the current state of all jobs.
You can set this to whatever interval is fine for you.

### 3. Notifications:
Notifications will appear as little popup messages at the bottom of the screen as soon as a job finished building.
You can disable this if you dont like it.
"stack notifications" means that notifications will be stored in the bottom right corner until you read them (click the notification to make it disappear).
Please be aware that the extension checks your Jenkins CI Server only at the provided auto-refresh interval.
If the build time for a job is shorter than the auto-refresh interval the extension will most likely not notice finished builds.

### 4. Filter jobs:
There is a filter for each job state. Enabling the switch will show the matching jobs in the popup menu, disabling the switch will hide the jobs.
