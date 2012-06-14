Flow5 includes a set of command line tools. To get access to these tools you should either install globally 
(which will add aliases) or install locally and add:

	export PATH=$PATH:node_modules/.bin:~/node_modules/.bin
	
(or equivalent) to your shell configuration

To install locally (no sudo required)

	npm install flow5

To install globally

	sudo npm install --global flow5
	
	
Then

  flow5 start
	
will start the flow5 development server and open a browser pointing to the root page


Chrome is the default browser
	

