gnome3-jenkins
==============


description:
Gnome 3 Shell Extension to represent the current state of all jobs of a Jenkins CI Server.
By default it monitors a local Jenkins instance by using its JSON API at http://localhost:8080/api/json.
See "configuration" for details on how to customize this for your needs.


requirements:
- Gnome 3.4.x
- Jenkins CI Server (with json api publicly available, see configuration)


installation (automatically):
I will make the extension publicly available on extensions.gnome.org. Until then you have to stick to installing the extension manually. 


installation (manually):
1. Copy all files to ~/.local/share/gnome-shell/extensions/gnome3-jenkins@philipphoffmann.de

2. Assuming that you have the gnome shell running hit Alt+F2, type "r" or "restart" (without quotation marks), hit enter. the shell should now restart.

3. In a terminal run

gsettings set org.gnome.shell enabled-extensions "['gnome3-jenkins@philipphoffmann.de']"

to enable the extension. It should then be visible in your status bar.
If everything is set up correctly you should be able to click the extension icon to bring up a popup menu with all your Jenkins jobs. 


configuration:
There are two settings you can configure for this extension:

1. The Jenkins CI Server JSON API URL:
Open up extension.js, you should find a variable named "JENKINS_JSON_API_URL".
Set its value to your Jenkins web frontend URL and append "/api/json".
You should check this URL in your browser to see if it is accessible.

2. The auto-refresh interval:
You can change the auto-refresh interval that the extensions uses to track changes.
It is set to 3 seconds (3000 milliseconds) by default, meaning that every 3 seconds the extension requests the Jenkins CI Server for the current state of all jobs.
You can set this to whatever interval is fine for you.

