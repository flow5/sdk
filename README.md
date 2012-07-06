Flow5 requires 

* nodejs >= v0.6.15 
* npm >= v1.0


To install the flow5 sdk:

  $ sudo npm install --global flow5
  
or

  $ git clone git://github.com/flow5/sdk.git
  $ sudo npm install --global sdk
  
  
To install the flow5 site/tutorial package:

  $ git clone git://github.com/flow5/site.git


To link a package to the flow5 development server:

  $ f5 link package-name path-to-package
  
e.g.

  $ cd site
  $ f5 link site .

  
To start the flow5 development server:

  $ f5 start

Then to view the package in a browser:

  http://localhost:8008/package-name/?mobile=true&debug=true&geometry=iphone-portrait&inline=true&frame=true
  
e.g.

  http://localhost:8008/site/?mobile=true&debug=true&geometry=iphone-portrait&inline=true&frame=true
  
  
To create an iOS native application:

  restart Xcode after installation


To view the flow5 source:

  $ npm explore --global flow5
  $ open .
  

	
	

