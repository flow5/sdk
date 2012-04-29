#get the app name from the Flow5 plist (may be a command line option at some point)
PKG=`defaults read ${SRCROOT}/f5 package`
COMPANY=`defaults read ${SRCROOT}/f5 company`

defaults write ${SRCROOT}/${PROJECT_NAME}-Info CFBundleIdentifier -string "com.$COMPANY.$PKG"