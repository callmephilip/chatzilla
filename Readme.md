# Realtime chat using Flask +  Heroku 
## featuring socket.io + Gevent-socketio   


We will be building a realtime chat application using Flask, a popular micro web framework and socket.io. All of this running on Heroku   


### Getting started 

I assume you know what Heroku is and you've seen Python before. Prior knowledge of Flask is a plus but given how minimalistic it is, you can just tag along.  

<What is socket.io and why we are using it?>

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

### Setup basic Flask app

#### Virtual environment

As every responsible Python dev, you use some kind of virtual environment manager. I use virtual env helper. Create a virtual environment named 'chatzilla' and automatically activate it:

```
mkvirtualenv chatzilla
``` 

Virtual envs save your mental health and remaining hair, so use them. 

#### Get all the goods using Pip

Pip is great for getting all your jazz organized. We'll be using it to install all the modules we need to make Chatzilla happen.

```
pip install Flask gevent gevent-websocket gevent-socketio gunicorn==0.16.1 
```

<explain what these modules are + comment on gunicorn deal http://stackoverflow.com/questions/14656841/geventsocketioworker-has-no-attribute-socket>

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

Let's create the entry point for the application now

```
touch chatzilla.py
``` 

Let's fill it with some Python

```
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

```
from chatzilla import application
from gevent import monkey
from socketio.server import SocketIOServer


monkey.patch_all()

if __name__ == '__main__':
    SocketIOServer(('', application.config['PORT']), application, resource="socket.io").serve_forever()
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

This should launch a local dev server on your machine. If you head to http://localhost:5000/, you should be able to witness Chatzilla in all it's somewhat glory.

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
