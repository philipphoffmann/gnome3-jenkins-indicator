#!/bin/bash

# build schemas
glib-compile-schemas schemas

# build locales
msgfmt -o locale/de_DE/LC_MESSAGES/jenkins-indicator.mo locale/de_DE/LC_MESSAGES/jenkins-indicator.po
msgfmt -o locale/fr_FR/LC_MESSAGES/jenkins-indicator.mo locale/fr_FR/LC_MESSAGES/jenkins-indicator.po
