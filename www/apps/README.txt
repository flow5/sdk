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

7) add elements and scripts blocks to the manifest for

	templates.html
	templates.css
	viewdelegates.js
	
	(names can be anything but these are descriptive)





	
