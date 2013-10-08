# Realtime chat with Flask and Heroku 


This is a step by step tutorial on building a basic real time chat application using [Flask](http://flask.pocoo.org/), [socket.io](http://socket.io/) and [gevent-socketio](https://github.com/abourget/gevent-socketio). All the code is available [here](https://github.com/callmephilip/chatzilla). You can find live version of the app [here](http://chatzilla.herokuapp.com).   

[![Chatzilla screen](https://dl.dropboxusercontent.com/u/9224326/www/chatzilla.screen.png)](http://chatzilla.herokuapp.com)

> As of Oct 8 2013, Heroku rolled out Public Beta of Websockets. The official announcement can be found [here](https://blog.heroku.com/archives/2013/10/8/websockets-public-beta). 

If you don't enable Websocket functionality on Heroku, Socket.io will fallback to XHR polling.

To enable websockets on your Heroku app, use the following command

```
heroku labs:enable websockets -a YOUR-APP-NAME
``` 
   
## Chapter 1: Getting started 

I assume you know what Heroku is and you've seen Python before. Prior knowledge of Flask is a plus but given how minimalistic it is, you can just tag along.  


### Heroku up

First things first, let's create a shiny new appication on Heroku

```
heroku apps:create YOUR_APPLICATION_NAME
```

I called my app 'chatzilla' and got the following output

```
Creating chatzilla... done, stack is cedar
http://chatzilla.herokuapp.com/ | git@heroku.com:chatzilla.git
``` 

The git part is important, let's put it to good use. Let's setup a git repository and point it towards heroku 

```
git init
git remote add heroku git@heroku.com:<YOUR_APP_NAME>.git
```

We now have an empty git repository with a remote aliased 'heroku' pointing to the Heroku git for the project. The game is afoot. 

> As of Oct 8 2013, Heroku rolled out Public Beta of Websockets. The official announcement can be found [here](https://blog.heroku.com/archives/2013/10/8/websockets-public-beta). 

If you don't enable Websocket functionality on Heroku, Socket.io will fallback to XHR polling.

To enable websockets on your Heroku app, use the following command

```
heroku labs:enable websockets -a YOUR-APP-NAME
``` 

### Setup basic Flask app

#### Virtual environment

As every responsible Python developer, you use some kind of virtual environment manager (I personally use [virtual env wrapper](http://virtualenvwrapper.readthedocs.org/en/latest/index.html)). Create a virtual environment named 'chatzilla' (or something else) and automatically activate it:

```
mkvirtualenv chatzilla
``` 

Virtual envs save your mental health and remaining hair, so use them. 

#### Get all the goods using Pip

Pip is great for getting all your jazz organized. We'll be using it to install all the modules we need to make Chatzilla happen.

```
pip install Flask gevent gevent-websocket gevent-socketio gunicorn==0.16.1 
```

Please note we are using a particular version of the gunicor since later versions seem to have certain [issues](stackoverflow.com/questions/14656841/geventsocketioworker-has-no-attribute-socket). 

#### Freeze

Once Pip has installed all the modules to our previously pristine virtual environment, it's time to get a snapshot of what's installed so that when you move your app elsewhere, you can easily restore the environment

```
pip freeze > requirements.txt
```

Your requirements.txt should look something like this

```
Flask==0.10.1
Jinja2==2.7.1
MarkupSafe==0.18
Werkzeug==0.9.4
gevent==0.13.8
gevent-socketio==0.3.5-rc2
gevent-websocket==0.3.6
greenlet==0.4.1
gunicorn==0.16.1
itsdangerous==0.23
wsgiref==0.1.2
``` 

#### chatzilla.py

Let's create an entry point for the application now

```
touch chatzilla.py
``` 

Let's fill it with some Python

```python
from gevent import monkey
from flask import Flask

monkey.patch_all()

application = Flask(__name__)
application.debug = True
application.config['PORT'] = 5000


@application.route('/', methods=['GET'])
def landing():
    return "Welcome to Chatzilla"
``` 

In it's current state, our app has none of the promised realtime awesomeness but we'll get there - one step at a time. 

#### run_server.py

In order to run chatzilla, we'll add another python module

```
touch run_server.py
``` 

It looks like this:

```python
from chatzilla import application
from gevent import monkey
from socketio.server import SocketIOServer


monkey.patch_all()

if __name__ == '__main__':
    SocketIOServer(
    	('', application.config['PORT']), 
    	application,
    	resource="socket.io").serve_forever()
```

### Procfile : Flask meets Heroku 

Before a much deserved refreshing beverage, let's tell Heroku how to run our application using Procfile

```
touch Procfile
```

Inside:

```
web: gunicorn --worker-class socketio.sgunicorn.GeventSocketIOWorker run_server
```

This is basically us saying: could we have a web instance running gunicorn with a worker that can speak socket.io and yeah, check run_server.py for more instructions, por favor.

### But will it blend?

Let's see if this works

```
foreman start
```

This should launch a local dev server on your machine. If you head to http://localhost:5000/, you should be able to witness Chatzilla in all its glory.

Let's go global now 

```
git add .
git commit -a -m "setup basic Flask app"
git push heroku master
``` 

This should keep Heroku busy for a few moments. Once it's done processing the push, we can take a look at Chatzilla in the wild

```
heroku open
```

### Before you panic

Just in case you are stuck/confused/lazy, you can grab all the code we've produced so far [here](https://github.com/callmephilip/chatzilla/releases/tag/v0.1) and keep following along.  


## Chapter 2: Sockets, por favor

### Wire a namespace

We currently have a socket.io endpoint exposed to the world and we should start handling various events that will get triggered once people start using it. Head to chatzilla.py and add the following:

```python
@application.route('/socket.io/<path:remaining>')
def socketio(remaining):
    try:
        socketio_manage(request.environ, {'/chat': ChatNamespace}, request)
    except:
        application.logger.error("Exception while handling socketio connection",
                         exc_info=True)
    return Response()

```  

Also update import statements on the top of the module: 

```python
from flask import Flask, Response, render_template, request
from socketio import socketio_manage
```

socketio function maps to the /socket.io/someotherstuff url and this is how the client side of the Chatzilla will try to reach out to the server with some urgent real time goodness. We obviously need to handle that, and we are doing it by proxying the request to ChatNamespace (which we'll create in a second). 

Namespaces give us a way to manage various sub categories within a socket.io endpoint. For Chatzilla we will only be using a single such category called 'chat'. Let's look what a namespace definition might look like in our case:

```python
class ChatNamespace(BaseNamespace):
    def initialize(self):
        self.logger = application.logger
        self.log("Socketio session started")

    def log(self, message):
        self.logger.info("[{0}] {1}".format(self.socket.sessid, message))

    def recv_connect(self):
        self.log("New connection")

    def recv_disconnect(self):
        self.log("Client disconnected")
```  

ChatNamespace does not do a lot at this point - it logs connects and disconnects and that's it. Make sure you add the missing import to the chatzilla.py 

```python
from socketio.namespace import BaseNamespace
``` 

### Client is always right

Let's try to figure out if we can actually connect to the chat server from the client. One step at a time.

#### Massive redesign

Let's fix our landing page a bit. Start by bringing in templates

```
mkdir templates
cd templates
touch landing.html
``` 

Populate landing.html with the following html

```html
<!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js lt-ie9 lt-ie8 lt-ie7"> <![endif]-->
<!--[if IE 7]> <html class="no-js lt-ie9 lt-ie8"> <![endif]-->
<!--[if IE 8]> <html class="no-js lt-ie9"> <![endif]-->
<!--[if gt IE 8]><!--> <html class="no-js"> <!--<![endif]-->
<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
	<meta http-equiv="cache-control" content="no-cache" />
	<title>Chatzilla</title>
</head>
<body>
	<header>
		<h1>Welcome to Chatzilla</h1>
	</header>
	<footer></footer>

	<script src="http://code.jquery.com/jquery-1.10.1.min.js"></script>
	<script>
		$(function(){
			console.log("Welcome to Chatzilla");
		});
	</script>
</body>
</html>
```


Now let's render the template using Flask:

```python
@application.route('/', methods=['GET'])
def landing():
    return render_template('landing.html')
```

Don't forget imports

```python
from flask import Flask, Response, render_template
```

Once you run ```foreman start``` you should see a shiny new Chatzilla interface. Epic.

#### Wire the socket

Let's bring socket.io javascript goodness in the mix. 

```
mkdir static
cd static
mkdir scripts
cd scripts
curl -O https://dl.dropboxusercontent.com/u/9224326/www/chatzilla/scripts/socket.io.min.js 
-O https://dl.dropboxusercontent.com/u/9224326/www/chatzilla/scripts/WebSocketMain.swf 
-O https://dl.dropboxusercontent.com/u/9224326/www/chatzilla/scripts/WebSocketMainInsecure.swf
``` 

Let's update templates/landing.html to include socket.io

```html
<!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js lt-ie9 lt-ie8 lt-ie7"> <![endif]-->
<!--[if IE 7]> <html class="no-js lt-ie9 lt-ie8"> <![endif]-->
<!--[if IE 8]> <html class="no-js lt-ie9"> <![endif]-->
<!--[if gt IE 8]><!--> <html class="no-js"> <!--<![endif]-->
<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
	<meta http-equiv="cache-control" content="no-cache" />
	<title>Chatzilla</title>
</head>
<body>
	<header>
		<h1>Welcome to Chatzilla</h1>
	</header>
	<footer></footer>

	<script src="http://code.jquery.com/jquery-1.10.1.min.js"></script>
	<script src="{{ url_for('static', filename='scripts/socket.io.min.js') }}"></script>
	<script>
		$(function(){
			console.log("Welcome to Chatzilla");
		});
	</script>
</body>
</html>
```

### Connect to the server

With socket.io javascript in place, we can now connect to our chat instance. Update landing.html template with the following code

```javascript
$(function(){
	console.log("Welcome to Chatzilla");
	var socket = io.connect('/chat');
	socket.on('connect', function () {
		alert("You are connected to the chat server");
	});
});
```
Refresh the page to see the popup. Hooray!

### Join the chat

Once connected to the chat server, we should be able to join chat. Let's implement that. Jump back to chatzilla.py and add the following block to the ChatNamespace:

```python
def on_join(self, name):
	self.log("%s joined chat" % name)
	return True, name
```   

Back to the client, let's update the 'connect' event handler 

```javascript
socket.on('connect', function () {
	socket.emit('join', 'Bob', function(joined, name){
		console.log(joined,name);
	});
});
```

Notice how return values from the on_join in the ChatNamespace are automatically propagate to the client and we can recover them in the event handler for the emit method.

### Send a message

Let's add message sending functionality to the chat service. Start with the backend again

```python
def on_message(self, message):
	self.log('got a message: %s' % message)
	return True, message
``` 

And now the client, let's automatically send a message once someone joins the chat

```javascript
socket.emit('join', 'Bob', function(joined, name){
	socket.emit('message', 'hello this is ' + name, function(sent){
		console.log("message sent: ", sent);
	});
});
```

### Broadcast

When a new message arrives to the server, we will want to send it to other people in the system. Let's get back to the ChatNamespace in chatzilla.py and add a BroadcastMixin which will help us do just that

```python
class ChatNamespace(BaseNamespace, BroadcastMixin):
```

Keeping imports happy

```python
from socketio.mixins import BroadcastMixin
```

With BroadcastMixin attached to the ChatNamespace, we can update the on_message handler to look like this

```python
def on_message(self, message):
	self.log('got a message: %s' % message)
	self.broadcast_event_not_me("message", message)
	return True, message
```

We can now update the client to look something like this

```javascript
$(function(){
	console.log("Welcome to Chatzilla");
	var socket = io.connect('/chat');
	socket.on('connect', function () {
		socket.emit('join', 'Bob', function(joined, name){
			socket.emit('message', 'hello this is ' + name, function(sent){
				console.log("message sent: ", sent);
			});
		});
	});

	socket.on('message', function(message){
		alert("got a message: " + message);
	});
});
```  

If you now have a couple of tabs open in your browser you'll see an alert box with a greeting from Bob.

### Let's deploy

Tons of users out there are looking forward to experiencing the new version of Chatzilla. Commit your changes, and push. 

### Before you panic

As before, you can grab the code for this chapter [here](https://github.com/callmephilip/chatzilla/releases/tag/v0.2)   
 

## Chapter 3 : UI

Now that we have a functioning client-server communication model, let's add some UI on top of that so that people can control what data gets sent to the server + get rid of alert popups and display data more gracefully.

### Move some stuff around

Let's isolate client side code in a separate module so we can stop poluting the landing page template

```
touch static/scripts/chatzilla.js
```    

Let's move all the inline js from the landing template to chatzilla.js so it looks like this

```javascript
(function($,window){
	$(function(){
		console.log("Welcome to Chatzilla");
		var socket = io.connect('/chat');
		socket.on('connect', function () {
			socket.emit('join', 'Bob', function(joined, name){
				socket.emit('message', 'hello this is ' + name, function(sent){
					console.log("message sent: ", sent);
				});
			});
		});

		socket.on('message', function(message){
			alert("got a message: " + message);
		});
	});
}($,window));
```

The landing template should now look something like this

```html
<!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js lt-ie9 lt-ie8 lt-ie7"> <![endif]-->
<!--[if IE 7]> <html class="no-js lt-ie9 lt-ie8"> <![endif]-->
<!--[if IE 8]> <html class="no-js lt-ie9"> <![endif]-->
<!--[if gt IE 8]><!--> <html class="no-js"> <!--<![endif]-->
<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
	<meta http-equiv="cache-control" content="no-cache" />
	<title>Chatzilla</title>
</head>
<body>
	<header>
		<h1>Welcome to Chatzilla</h1>
	</header>
	<footer>
	</footer>

	<script src="http://code.jquery.com/jquery-1.10.1.min.js"></script>
	<script src="{{ url_for('static', filename='scripts/socket.io.min.js') }}"></script>
	<script src="{{ url_for('static', filename='scripts/chatzilla.js') }}"></script>
</body>
</html>
```
  
### Add join chat UI

Let's add a little join chat form in a section between the header and the footer of the landing page

```html
<section>
	<form class="join-chat">
		<label>Type your email to join the chat</label>
		<input name="email" type="email">
		<input type="submit" value="Join">
	</form>
</section>
```

Before we wire the handlers for the form, let's grab [jquery validation plugin])(http://jqueryvalidation.org/) we can put ot good use here. Place this right after the jquery script tag.

```html
<script src="http://ajax.aspnetcdn.com/ajax/jquery.validate/1.11.1/jquery.validate.min.js"></script>
```

Let's update chatzilla.js to handle form submission + validation

```javascript
(function($,window){
	

	var bindUI = function(){
		
		$(".join-chat").validate({
			submitHandler: function(form) {
				console.log($(form).find("[name='email']").val() + 
					" wants to join the chat");
			}
		});
	};

	var ready = function(){

		bindUI();

		console.log("Welcome to Chatzilla");
		var socket = io.connect('/chat');
		socket.on('connect', function () {
			socket.emit('join', 'Bob', function(joined, name){
				socket.emit('message', 'hello this is ' + name, function(sent){
					console.log("message sent: ", sent);
				});
			});
		});

		socket.on('message', function(message){
			alert("got a message: " + message);
		});
	};



	$(function(){ ready(); });

}($,window));
```

Let's also start organizing our socket interactions so we can easily call our chat server from various UI event handlers. Here's how this little submodule could look like (with 2 methods for now):

```javascript
var chatAPI = {
	connect : function(done) {
		this.socket = io.connect('/chat');
		this.socket.on('connect', done);
	},

	join : function(email, onJoin){
		this.socket.emit('join', email, onJoin);
	}

};	
```

And as we update the rest of chatzilla.js: 

```javascript
(function($,window){
	
	var chatAPI = {

		connect : function(done) {
			this.socket = io.connect('/chat');
			this.socket.on('connect', done);
		},

		join : function(email, onJoin){
			this.socket.emit('join', email, onJoin);
		}

	};	

	var bindUI = function(){
		$(".join-chat").validate({
			submitHandler: function(form) {
				chatAPI.join($(form).find("[name='email']").val(), 
					function(joined, name){
						if(joined){
							alert("You've joined Chatzilla");
						}
					});
			}
		});
	};

	var ready = function(){
		bindUI();
		console.log("Welcome to Chatzilla");
		chatAPI.connect(function(){});
	};



	$(function(){ ready(); });

}($,window));
```

Commit what you have and let's move on.

### Add Send Message UI

Once the connection is established, let's hide the join form and show some kind of message composer:

```html
<form class="compose-message-form" style="display:none;">
	<textarea name="message" required></textarea>
	<input type="submit" value="send">
</form>
```

Our chatAPI module will need a new method (sendMessage): 

```javascript
var chatAPI = {
	connect : function(done) {
		this.socket = io.connect('/chat');
		this.socket.on('connect', done);
	},

	join : function(email, onJoin){
		this.socket.emit('join', email, onJoin);
	},

	sendMessage : function(message, onSent) {
		this.socket.emit('message', message, onSent);
	}
};	
```

And here's what chatzilla.js looks like now 

```javascript
(function($,window){
	
	var chatAPI = {

		connect : function(done) {
			this.socket = io.connect('/chat');
			this.socket.on('connect', done);
		},

		join : function(email, onJoin){
			this.socket.emit('join', email, onJoin);
		},

		sendMessage : function(message, onSent) {
			this.socket.emit('message', message, onSent);
		}

	};	

	var bindUI = function(){
		$(".join-chat").validate({
			submitHandler: function(form) {
				chatAPI.join($(form).find("[name='email']").val(), 
					function(joined, name) {
						if(joined){
							alert("You've joined Chatzilla");
							$(form).hide();
							$(".compose-message-form").show();
						}
					});
			}
		});

		$(".compose-message-form").validate({
			submitHandler: function(form) {
				chatAPI.sendMessage($(form).find("[name='message']").val(), 					function(sent,message){
						if(sent){
							alert("Your message was sent");
						}
					}
				);
			}
		});
	};

	var ready = function(){
		bindUI();
		console.log("Welcome to Chatzilla");
		chatAPI.connect(function(){});
	};



	$(function(){ ready(); });

}($,window));
```

Notice, how we are handling the message form in a similar way + we toggle visibility on both forms after joining chat.

Commit what you have and let's move on.

## Add Message List UI

As any respectable Chat application out there Chatzilla needs a list of messages that people are exchanging. Let's build it. 

First, let's figure out how this impacts our chatApi module. We'll have chatAPI trigger a handler once a new message is received: 

```javascript

connect : function(done) {
	
	var that = this;

	this.socket = io.connect('/chat');
	this.socket.on('connect', done);

	this.socket.on('message', function(message){
		if(that.onMessage){
			that.onMessage(message);
		}
	});
},

``` 

And then in the bindUI, we can do the following:

```javascript
chatAPI.onMessage = function(message){
	alert("you got a message: " + message);
};
```

chatzilla.js now looks like this

```javascript
(function($,window){
	
	var chatAPI = {

		connect : function(done) {

			var that = this;

			this.socket = io.connect('/chat');
			this.socket.on('connect', done);

			this.socket.on('message', function(message){
				if(that.onMessage){
					that.onMessage(message);
				}
			});
		},

		join : function(email, onJoin){
			this.socket.emit('join', email, onJoin);
		},

		sendMessage : function(message, onSent) {
			this.socket.emit('message', message, onSent);
		}

	};	

	var bindUI = function(){

		$(".join-chat").validate({
			submitHandler: function(form) {
				chatAPI.join($(form).find("[name='email']").val(), 
					function(joined, name){
						if(joined){
							alert("You've joined Chatzilla");
							$(form).hide();
							$(".compose-message-form").show();
						}
					});
			}
		});

		$(".compose-message-form").validate({
			submitHandler: function(form) {
				chatAPI.sendMessage($(form).find("[name='message']").val(), 
					function(sent,message){
						if(sent){
							alert("Your message was sent");
						}
					});
			}
		});

		chatAPI.onMessage = function(message){
			alert("you got a message: " + message);
		};

	};

	var ready = function(){
		bindUI();
		console.log("Welcome to Chatzilla");
		chatAPI.connect(function(){});
	};



	$(function(){ ready(); });

}($,window));
```

Let's get rid of the alerts by creating a container for the messages in the landing.html. After we update the section of the landing.html it looks like this 

```html
<section>
	<form class="join-chat">
		<label>Type your email to join the chat</label>
		<input name="email" type="email">
		<input type="submit" value="Join">
	</form>

	<ul class="messages" style="display:none;"></ul>

	<form class="compose-message-form" style="display:none;">
		<textarea name="message" required></textarea>
		<input type="submit" value="send">
	</form>
</section>
```

Notice that the message list is initially invisible. We'll show it once a person joins the chat (just like with the message form)


```javascript
$(".messages").show();
```

Let's update the onMessage handler so that it displays the message within the list: 

```javascript
chatAPI.onMessage = function(message){
	$(".messages").append(
		jQuery("<li>").html(message)
	);
};
``` 
Checkout the result (2+ tabs). Commit, grab a drink.

## More context

Current version of Chatzilla has a number of issues. The most noticeable one is that you can't really tell who the messages you receive come from. Let's fix that.

### Session

We can take advantage of session data to keep track of the message sender. Let's modify on_join handler for the ChatNamespace in chatzilla.py

```python
def on_join(self, email):
	self.log("%s joined chat" % email)
    self.session['email'] = email
    return True, email
```

This will allow to keep track of who's sending a message and we can use this data when we broadcast messages to others in the chat

```python
def on_message(self, message):
	self.log('got a message: %s' % message)
    self.broadcast_event_not_me("message",{ 
    	"sender" : self.session["email"], 
    	"content" : message})
    return True, message
```
### Tell the client

We can now update chatzilla.js to take advantage of this additional information

```javascript
chatAPI.onMessage = function(message){
	$(".messages").append(
		jQuery("<li>").html(
			"<b>" + message.sender + "</b>: " + message.content 
		)
	);
};
```

Let's also make sure your own message are added to the list once sent:

```javascript
$(".compose-message-form").validate({
			submitHandler: function(form) {
				chatAPI.sendMessage($(form).find("[name='message']").val(), 					function(sent,message){
						if(sent){
							$(".messages").append(
								jQuery("<li>").html(
									"<b>Me</b>: " + message
								)
							);
						}
					});
			}
		});
```

Commit what you have. And push what you have to heroku.

```
git push heroku master
```

### Before you panic

All the code for chapter 3 is [here](https://github.com/callmephilip/chatzilla/releases/tag/v0.3) if you need it.


## Chapter 4: More UI

The final version of the app is available [here](http://chatzilla.herokuapp.com/). You'll notice it's quite different from where we left in Chapter 3. All the code is available [here](https://github.com/callmephilip/chatzilla).




