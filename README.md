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
Each tab holds the settings for one Jenkins CI Server.
You can add more servers by clicking **add server**.
There is a little **X** button on the tabs to remove the server.
Each server you configure will be represented with its own indicator in the status panel.

You can configure the following settings:

### 1. The Jenkins CI Server connection:
#### Jenkins CI Server name
Set this value to whatever you want. This value is only used in the popup menu and notifications. You should provide a name thats useful to you.

#### Jenkins CI Server Web Frontend URL
Set its value to your Jenkins web frontend URL. If you have views defined for your Jenkins dashboard you can also put in the URL of the view here.
You can check if the JSON API is available in your web browser by appending `/api/json` to your web frontend URL (which is what the extension does to get its information).

#### Use authentication
Enable authentication if your Jenkins CI Server instance uses authentication.

#### Authentication user
Provide a username you want the extension to use to login to your Jenkins CI Server instance if authentication is enabled.

#### Authentication API token
Every Jenkins CI Server user has an API token. This is used for querying the Jenkins CI Server API instead of the users password. You can get the API token from the Jenkins CI Server Web Frontend. Go to the users preferences and click "Show API token".

#### Green Balls Plugin
You can enable the "Green Balls Plugin" in this section which enables using green ball icons instead of blue ones, just like the green balls plugin in Jenkins (Thanks to [negesti](https://github.com/negesti) for this contribution).

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
You can also filter jobs by their name. Providing "all" will show you all jobs.
To filter your jobs by name you have to provide a comma-separated list of the jobs you want to appear in the popup menu.
If you have a lot of jobs and only want to hide some of them, provide them as comma-separated list of names and prefix each name with **!**.

## Credits
Thanks to the following contributors for their valuable feedback:
- [negesti](https://github.com/negesti) (Green Balls Plugin)
- [fchaillou](https://github.com/fchaillou) (Gnome 3.6 compatibility and job name filter)
