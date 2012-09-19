#write the current hostname into the Flow5.plist so the app can use it to find the devserv
defaults write ${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/f5 devservhost -string $HOSTNAME

#get the app name from the f5.plist (may be a command line option at some point)
PKG=`defaults read ${SRCROOT}/f5 package`
COMPANY=`defaults read ${SRCROOT}/f5 company`

#set the bundle display name
defaults write ${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/Info CFBundleName -string $PKG
defaults write ${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/Info CFBundleIdentifier -string "com.$COMPANY.$PKG"

FBAPPID=`curl http://$HOSTNAME:8008/$PKG/facebook_appid.txt`
defaults write ${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/Info CFBundleURLTypes -array "<dict><key>CFBundleURLSchemes</key><array><string>fb$FBAPPID</string></array></dict>"

CONFIG=$CONFIGURATION
PLATFORM=$PLATFORM_NAME

#configures the html5 code for release while leaving the native code in debug config
#this is useful because it enables the use of localhost:9999 for debugging release html5
#CONFIG="Release"

#makes simulator behavior identical to device
#otherwise simulator will load live from the server
#NOTE: also have to change AppDelegate.m to point simlulator target to the local startpage
#      this could be improved
#PLATFORM="iphone"

if [ $CONFIG = "Debug" ]
then
PDEBUG="debug=true"
#PCONSOLE="&ide=true"
else
PDEBUG="debug=false"
fi

if [[ $PLATFORM = "iphonesimulator" && $CONFIG = "Debug" ]]
then
PINLINE="inline=false"
PCOMPRESS="compress=false"
else
PINLINE="inline=true"
PCOMPRESS="compress=true"
fi

URL="http://$HOSTNAME:8008/$PKG/?native=true&mobile=true&platform=ios&$PINLINE&$PDEBUG&$PCOMPRESS$PCONSOLE"

echo $URL

if [[ $PLATFORM != "iphonesimulator" || $CONFIG != "Debug" ]]
then
#get the webapp
mkdir -p ${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/www
/usr/local/bin/wget $URL -O ${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/www/index.html
fi
