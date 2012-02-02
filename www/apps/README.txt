To create a new application:

Setup the html5 app:

1) create a folder for your webapp
	myApp/www

2) cd flow5/www/apps

3) create an empty flowspec.json

{

}


4) create a minimal manifest.json

{
	"all": {
		"flowspecs": [
			"flowspec.json"
		]
	}
}

5) ln -s <path-to-myApp/www> myApp

Now you can run your app from devserv:




6) build out your flow spec

	auto generated UI will be created for navigating the flow in browser
	see the demo app for examples of how to build flows and use f5 widgets
	

7) add elements and scripts blocks to the manifest for

	templates.html
	templates.css
	viewdelegates.js
	
	(names can be anything but these are descriptive)
	
	
8) setup the native shells

ios)
	create a folder myApp/ios



android)
	create a folder myApp/android
	
	
	
Facebook

1) create a file called facebook_appid.txt in myApp/www
2) call F5.facebook.login(function result()) to connect using facebook





	
